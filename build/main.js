"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const captcha_1 = __importDefault(require("./captcha"));
const captcha = new captcha_1.default(fs_1.default.readFileSync('demo.png'), true);
console.log(captcha.solve());
// to generate 0-1 text image
// captcha.ilustrate();
// used to generate patterns from image; To generate pattern use "alphabet.png" instead of captcha image
// captcha.generate();
