"use strict";
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _Captcha_instances, _Captcha_headers, _Captcha_logger, _Captcha_mesh, _Captcha_pngIdentifier, _Captcha_pixel, _Captcha_process, _Captcha_IHDR, _Captcha_IDAT, _Captcha_u32, _Captcha_isArrayEqual, _Captcha_validate, _Captcha_log;
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const zlib_1 = __importDefault(require("zlib"));
const patterns = JSON.parse(fs_1.default.readFileSync("pattern.json", "utf8"));
class Captcha {
    constructor(buff, logger = false) {
        _Captcha_instances.add(this);
        _Captcha_headers.set(this, void 0);
        _Captcha_logger.set(this, void 0);
        _Captcha_mesh.set(this, []);
        _Captcha_pngIdentifier.set(this, [137, 80, 78, 71, 13, 10, 26, 10]);
        _Captcha_pixel.set(this, [66, 155, 255, 255]);
        __classPrivateFieldSet(this, _Captcha_headers, {
            width: 0,
            height: 0,
            bitDepth: 0,
            colorType: 0,
        }, "f");
        __classPrivateFieldSet(this, _Captcha_logger, logger, "f");
        if (buff.length < 8 || !__classPrivateFieldGet(this, _Captcha_instances, "m", _Captcha_validate).call(this, buff)) {
            throw new Error("Invalid png format");
        }
        __classPrivateFieldGet(this, _Captcha_instances, "m", _Captcha_log).call(this, "Image successfully verified");
        __classPrivateFieldGet(this, _Captcha_instances, "m", _Captcha_process).call(this, buff.subarray(8));
    }
    /**
     * Trying to extract text from true-false mesh
     * @return string
     */
    solve() {
        const image_raw = __classPrivateFieldGet(this, _Captcha_mesh, "f").map(row => row.map(pixel => __classPrivateFieldGet(this, _Captcha_instances, "m", _Captcha_isArrayEqual).call(this, pixel, __classPrivateFieldGet(this, _Captcha_pixel, "f"))));
        const image = image_raw.slice(image_raw.findIndex(row => row.includes(true)));
        const latter_dim = [13, 18];
        var code = "";
        for (let x = 0; x <= image[0].length - latter_dim[0]; x++) {
            let result = null;
            for (let y = 0; y <= image.length - latter_dim[1]; y++) {
                result = match(x, y);
                if (result !== null) {
                    break;
                }
            }
            if (result === null) {
                continue;
            }
            code += result;
            x += latter_dim[0];
            __classPrivateFieldGet(this, _Captcha_instances, "m", _Captcha_log).call(this, `Found latter: ${result}`);
        }
        __classPrivateFieldGet(this, _Captcha_instances, "m", _Captcha_log).call(this, "Solving process complete");
        return code;
        function match(pos_x, pos_y) {
            const mesh = generate_mesh(pos_x, pos_y, latter_dim[0], latter_dim[1]);
            const latters = Array(patterns.length).fill(null, 0, patterns.length).map((_, index) => ({ latter: patterns[index].latter, failed: 0, required: 0 }));
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
                return null;
            }
            const failed = result.map(latter => latter.failed);
            return result[failed.indexOf(Math.min(...failed))].latter;
        }
        function generate_mesh(x1, y1, x2, y2) {
            const mesh = [];
            for (let i = y1; i < y1 + y2; i++) {
                mesh.push(image[i].slice(x1, x1 + x2));
            }
            return mesh;
        }
    }
    /**
     * Represents image as 0-1 text
     */
    ilustrate() {
        // represent image as white-black text (0-1)
        fs_1.default.writeFileSync("bin", __classPrivateFieldGet(this, _Captcha_mesh, "f").map(row => row.map(pixel => __classPrivateFieldGet(this, _Captcha_instances, "m", _Captcha_isArrayEqual).call(this, pixel, __classPrivateFieldGet(this, _Captcha_pixel, "f")) ? "1" : "0").join("")).join("\n"));
    }
    /**
     * Generates match table;
     * Don't use!
    */
    generate() {
        const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
        const alphabetAscii = __classPrivateFieldGet(this, _Captcha_mesh, "f").map(row => row.map(pixel => __classPrivateFieldGet(this, _Captcha_instances, "m", _Captcha_isArrayEqual).call(this, pixel, __classPrivateFieldGet(this, _Captcha_pixel, "f")))).slice(1);
        const table = [];
        while (alphabetAscii.length > 0) {
            const pattern = alphabetAscii.splice(0, alphabetAscii.findIndex(row => row.every(value => !value)) + 1).slice(0, -1).map(row => row.slice(1, row.lastIndexOf(true) + 1));
            const count = pattern.reduce((prev, row) => { prev += row.filter(value => value).length; return prev; }, 0);
            table.push({
                latter: alphabet.shift(),
                pixels: count,
                pattern: pattern,
            });
        }
        fs_1.default.writeFileSync("pattern.json", JSON.stringify(table, null, 2));
    }
}
exports.default = Captcha;
_Captcha_headers = new WeakMap(), _Captcha_logger = new WeakMap(), _Captcha_mesh = new WeakMap(), _Captcha_pngIdentifier = new WeakMap(), _Captcha_pixel = new WeakMap(), _Captcha_instances = new WeakSet(), _Captcha_process = function _Captcha_process(buff) {
    // process chunks
    var itt_left = 10;
    while (itt_left > 0) {
        itt_left--;
        // extract chunk outside data
        const dataLength = __classPrivateFieldGet(this, _Captcha_instances, "m", _Captcha_u32).call(this, buff.subarray(0, 4));
        const type = buff.subarray(4, 8).toString('utf8');
        const content = buff.subarray(8, 8 + dataLength);
        // process chunk inside data
        switch (type) {
            case "IHDR":
                __classPrivateFieldGet(this, _Captcha_instances, "m", _Captcha_IHDR).call(this, content);
                break;
            case "IDAT":
                __classPrivateFieldGet(this, _Captcha_instances, "m", _Captcha_IDAT).call(this, content);
                break;
            case "IEND":
                itt_left = 0;
                break;
        }
        buff = buff.subarray(12 + dataLength);
    }
    __classPrivateFieldGet(this, _Captcha_instances, "m", _Captcha_log).call(this, "Extracting process complete");
}, _Captcha_IHDR = function _Captcha_IHDR(chunk) {
    // extract data from IHDR chunk
    __classPrivateFieldGet(this, _Captcha_headers, "f").width = __classPrivateFieldGet(this, _Captcha_instances, "m", _Captcha_u32).call(this, chunk.subarray(0, 4));
    __classPrivateFieldGet(this, _Captcha_headers, "f").height = __classPrivateFieldGet(this, _Captcha_instances, "m", _Captcha_u32).call(this, chunk.subarray(4, 8));
    __classPrivateFieldGet(this, _Captcha_headers, "f").bitDepth = chunk.at(8);
    __classPrivateFieldGet(this, _Captcha_headers, "f").colorType = chunk.at(9);
    if (__classPrivateFieldGet(this, _Captcha_headers, "f").bitDepth !== 8) {
        throw new Error("Bit depth must be 8");
    }
    if (![2, 6].includes(__classPrivateFieldGet(this, _Captcha_headers, "f").colorType)) {
        throw new Error("Color type must be 2 or 6");
    }
    __classPrivateFieldGet(this, _Captcha_instances, "m", _Captcha_log).call(this, "Extracted IHDR chunk");
}, _Captcha_IDAT = function _Captcha_IDAT(chunk) {
    __classPrivateFieldGet(this, _Captcha_instances, "m", _Captcha_log).call(this, "Found IDAT chunk");
    var chunkData = zlib_1.default.inflateSync(chunk).toJSON().data;
    const pixelLength = __classPrivateFieldGet(this, _Captcha_headers, "f").colorType === 6 ? 4 : 3;
    const lineLength = __classPrivateFieldGet(this, _Captcha_headers, "f").width * pixelLength;
    const filtred = [];
    // reverse filtering algorithm
    while (chunkData.length > 0) {
        const filterType = chunkData.shift();
        const row = chunkData.splice(0, lineLength);
        const last = filtred[filtred.length - 1];
        switch (filterType) {
            case 1:
                for (let i = pixelLength; i < row.length; i++) {
                    row[i] = (row[i] + row[i - pixelLength]) % 256;
                }
                break;
            case 2:
                for (let i = pixelLength; i < row.length; i++) {
                    row[i] = (row[i] + last[i]) % 256;
                }
                break;
            case 3:
                for (let i = pixelLength; i < row.length; i++) {
                    row[i] = (row[i] + Math.floor((row[i - pixelLength] + last[i]) / 2)) % 256;
                }
                break;
            case 4:
                for (let i = pixelLength; i < row.length; i++) {
                    row[i] = (row[i] + paethPredictor(row[i - pixelLength], last[i], last[i - pixelLength])) % 256;
                }
                break;
        }
        filtred.push(row);
    }
    __classPrivateFieldGet(this, _Captcha_instances, "m", _Captcha_log).call(this, "Successfully completed filtering process");
    // convert bytes into rgb / rgba
    __classPrivateFieldSet(this, _Captcha_mesh, filtred.map(row => {
        const pixels = [];
        while (row.length > 0) {
            pixels.push(row.splice(0, pixelLength));
        }
        return pixels;
    }), "f");
    // png filtering thing
    function paethPredictor(a, b, c) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        if (pa <= pb && pa <= pc) {
            return a;
        }
        if (pb <= pc) {
            return b;
        }
        return c;
    }
}, _Captcha_u32 = function _Captcha_u32(bytes) {
    return parseInt(bytes.toJSON().data.map(v => '0'.repeat(8 - v.toString(2).length) + v.toString(2)).join(''), 2);
}, _Captcha_isArrayEqual = function _Captcha_isArrayEqual(a, b) {
    return a.every((v, i) => v === b[i]);
}, _Captcha_validate = function _Captcha_validate(buff) {
    return buff.subarray(0, 8).toJSON().data.every((byte, index) => byte === __classPrivateFieldGet(this, _Captcha_pngIdentifier, "f")[index]);
}, _Captcha_log = function _Captcha_log(str) {
    const d = new Date();
    if (__classPrivateFieldGet(this, _Captcha_logger, "f"))
        console.log(`[owoCaptcha] (${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}:${d.getMilliseconds()})  ${str}`);
};
