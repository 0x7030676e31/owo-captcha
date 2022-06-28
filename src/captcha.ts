import fs from 'fs';
import zlib from 'zlib';

const patterns: {
  latter: string;
  pixels: number;
  pattern: boolean[][];
}[] = JSON.parse(fs.readFileSync("pattern.json", "utf8"));

export default class Captcha {
  #headers: {
    width: number,
    height: number,
    bitDepth: number,
    colorType: number,
  }
  #logger: boolean;
  #mesh: ([number, number, number, number] | [number, number, number])[][] = [];
  #pngIdentifier = [ 137, 80, 78, 71, 13, 10, 26, 10 ];
  #pixel = [ 66, 155, 255, 255 ];

  constructor(buff: Buffer, logger: boolean = false) {
    this.#headers = {
      width: 0,
      height: 0,
      bitDepth: 0,
      colorType: 0,
    }
    this.#logger = logger;

    if (buff.length < 8 || !this.#validate(buff)) {
      throw new Error("Invalid png format");
    }

    this.#log("Image successfully verified");
    this.#process(buff.subarray(8));
  }

  /**
   * Trying to extract text from true-false mesh
   * @return string
   */
  solve(): string {
    const image_raw = this.#mesh.map(row => row.map(pixel => this.#isArrayEqual(pixel, this.#pixel)));
    const image = image_raw.slice(image_raw.findIndex(row => row.includes(true)));
    const latter_dim = [ 13, 18 ];

    var code = "";
    for (let x = 0; x <= image[0].length - latter_dim[0]; x++) {
      let result = null;
      for (let y = 0; y <= image.length - latter_dim[1]; y++) {
        result = match(x, y);

        if (result !== null) {
          break
        }
      }

      if (result === null) {
        continue
      }
      
      code += result;
      x += latter_dim[0];
      this.#log(`Found latter: ${result}`);
    }

    this.#log("Solving process complete");

    return code

    function match(pos_x: number, pos_y: number) {
      const mesh = generate_mesh(pos_x, pos_y, latter_dim[0], latter_dim[1]);
      
      const latters: {
        latter: string;
        failed: number;
        required: number;
      }[] = Array(patterns.length).fill(null, 0, patterns.length).map((_, index) => ({ latter: patterns[index].latter, failed: 0, required: 0 }));

      // for-loop tree pls dont ask
      for (let y = 0; y < mesh.length; y++) {
        for (let x = 0; x < mesh[y].length; x++) {
          for (let i in latters) {
            if (mesh[y][x] !== ((patterns[i].pattern[y] || [])[x] || false)) {
              latters[i].failed += 1;
            }

            if (((patterns[i].pattern[y] || [])[x] || false) && mesh[y][x]) {
              latters[i].required += 1;
            }
          }
        }
      }
      
      const result = latters.filter((latter, index) => latter.required >= patterns[index].pixels);
      if (result.length === 0) {
        return null
      }

      const failed = result.map(latter => latter.failed);
      return result[failed.indexOf(Math.min(...failed))].latter
    }

    
    function generate_mesh(x1: number, y1: number, x2: number, y2: number) {
      const mesh: boolean[][] = [];
      for (let i = y1; i < y1 + y2; i++) {
        mesh.push(image[i].slice(x1, x1 + x2));
      }

      return mesh
    }
  }

  #process(buff: Buffer) {
    // process chunks
    var itt_left = 10;
    while (itt_left > 0) {
      itt_left--;

      // extract chunk outside data
      const dataLength = this.#u32( buff.subarray(0, 4) );
      const type = buff.subarray(4, 8).toString('utf8');
      const content = buff.subarray(8, 8 + dataLength);
      
      // process chunk inside data
      switch (type) {
        case "IHDR":
          this.#IHDR(content);
          break
        case "IDAT":
          this.#IDAT(content);
          break
        case "IEND":
          itt_left = 0;
          break
      }

      buff = buff.subarray(12 + dataLength);
    }

    this.#log("Extracting process complete");
  }

  /**
   * Represents image as 0-1 text
   */
  ilustrate() {
    // represent image as white-black text (0-1)
    fs.writeFileSync("bin", this.#mesh.map(row => row.map(pixel => this.#isArrayEqual(pixel, this.#pixel) ? "1" : "0").join("")).join("\n"));
  }

  /**
   * Generates match table;
   * Don't use!
  */
  generate() {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    const alphabetAscii = this.#mesh.map(row => row.map(pixel => this.#isArrayEqual(pixel, this.#pixel))).slice(1);

    const table = [];

    while (alphabetAscii.length > 0) {
      const pattern = alphabetAscii.splice(0, alphabetAscii.findIndex(row => row.every(value => !value)) + 1).slice(0, -1).map(row => row.slice(1, row.lastIndexOf(true) + 1));
      const count = pattern.reduce((prev: number, row) => { prev += row.filter(value => value).length; return prev }, 0);
      table.push({
        latter: alphabet.shift(),
        pixels: count,
        pattern: pattern,
      });
    }

    fs.writeFileSync("pattern.json", JSON.stringify(table, null, 2));
  }

  #IHDR(chunk: Buffer) {
    // extract data from IHDR chunk
    this.#headers.width = this.#u32( chunk.subarray(0, 4) );
    this.#headers.height = this.#u32( chunk.subarray(4, 8) );
    this.#headers.bitDepth = chunk.at(8)!;
    this.#headers.colorType = chunk.at(9)!;

    if (this.#headers.bitDepth !== 8) {
      throw new Error("Bit depth must be 8");
    }

    if (![2, 6].includes(this.#headers.colorType)) {
      throw new Error("Color type must be 2 or 6")
    }

    this.#log("Extracted IHDR chunk");
  }

  #IDAT(chunk: Buffer) {
    this.#log("Found IDAT chunk");
    var chunkData = zlib.inflateSync(chunk).toJSON().data;
    const pixelLength = this.#headers.colorType === 6 ? 4 : 3;
    const lineLength = this.#headers.width * pixelLength;

    const filtred: number[][] = [];

    // reverse filtering algorithm
    while (chunkData.length > 0) {
      const filterType = chunkData.shift();
      const row = chunkData.splice(0, lineLength);

      const last = filtred[filtred.length - 1];

      switch(filterType) {
        case 1:
          for (let i = pixelLength; i < row.length; i++) {
            row[i] = (row[i] + row[i - pixelLength]) % 256
          }
          break

        case 2:
          for (let i = pixelLength; i < row.length; i++) {
            row[i] = (row[i] + last[i]) % 256
          }
          break

        case 3:
          for (let i = pixelLength; i < row.length; i++) {
            row[i] = (row[i] + Math.floor((row[i - pixelLength] + last[i]) / 2)) % 256
          }
          break

        case 4:
          for(let i = pixelLength; i < row.length; i++) {
            row[i] = (row[i] + paethPredictor(row[i - pixelLength], last[i], last[i - pixelLength])) % 256
          }
          break
      }

      filtred.push(row);
    }
    this.#log("Successfully completed filtering process");

    // convert bytes into rgb / rgba
    this.#mesh = filtred.map(row => {
      const pixels = [];
      while(row.length > 0) {
        pixels.push(row.splice(0, pixelLength));
      }
      return pixels
    }) as any;

    // png filtering thing
    function paethPredictor(a: number, b: number, c: number) {
      const p = a + b - c;

      const pa = Math.abs(p - a);
      const pb = Math.abs(p - b);
      const pc = Math.abs(p - c);
    
      if (pa <= pb && pa <= pc) {
        return a
      }
    
      if (pb <= pc) {
        return b
      }
    
      return c
    }
  }

  #u32(bytes: Buffer) {
    return parseInt(bytes.toJSON().data.map(v => '0'.repeat(8 - v.toString(2).length) + v.toString(2)).join(''), 2);
  }

  #isArrayEqual(a: any[], b: any[]): boolean {
    return a.every((v, i) => v === b[i]);
  }

  #validate(buff: Buffer) {
    return buff.subarray(0, 8).toJSON().data.every((byte, index) => byte === this.#pngIdentifier[index]);
  }

  #log(str: string) {
    const d = new Date();
    if (this.#logger) console.log(`[owoCaptcha] (${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}:${d.getMilliseconds()})  ${str}`);
  }
}
