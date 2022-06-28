import fs from "fs";
import Captcha from "./captcha";

const captcha = new Captcha(fs.readFileSync('demo.png'), true);
console.log(captcha.solve());

// to generate 0-1 text image
// captcha.ilustrate();

// used to generate patterns from image; To generate pattern use "alphabet.png" instead of captcha image
// captcha.generate();