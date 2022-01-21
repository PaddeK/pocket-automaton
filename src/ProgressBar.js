'use strict';

const Progress = require('progress');

class ProgressBar
{
    static #maxTitleLength = 0;

    #title;

    constructor (title)
    {
        title = title.endsWith(':') ? title : `${title}:`;

        ProgressBar.#maxTitleLength = Math.max(ProgressBar.#maxTitleLength, title.length);

        this.#title = title;
    }

    init (total)
    {
        const
            width = process.stdout.isTTY ? process.stdout.columns : 80,
            format = `${this.#title.padEnd(ProgressBar.#maxTitleLength, ' ')} [:bar] :percent (Elapsed: :elapseds)`,
            opts = {incomplete: '-', complete: '#', head: '#', width, total};

        return new Progress(format, opts);
    }

    static printFixedWidthString (string, ...args)
    {
        string = string.endsWith(':') || string.length === 0 ? string : `${string}:`;

        console.log(string.padEnd(ProgressBar.#maxTitleLength, ' '), ...args);
    }
}

module.exports = title => new ProgressBar(title);
module.exports.printFixedWidthString = ProgressBar.printFixedWidthString;