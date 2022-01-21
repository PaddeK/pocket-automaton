'use strict';

const
    {join, basename, extname} = require('path'),
    {readFile, writeFile} = require('fs/promises'),
    ProgressBar = require('./ProgressBar')('Applying patches'),
    centra = require('./Centra'),
    IpsPatcher = require('./IpsPatcher');

class RomPatcher
{
    #pocketPath;

    constructor (pocketPath)
    {
        this.#pocketPath = pocketPath;
    }

    async applyPatches (matchingRoms, patchMap, showProgress = true)
    {
        const
            roms = Array.from(matchingRoms.entries()),
            progress = ProgressBar.init(roms.length);

        for await (let [hash, romFile] of roms) {
            const
                rom = await readFile(romFile),
                ips = await centra(patchMap.get(hash)).send(),
                patched = IpsPatcher.apply(rom, ips.body, patchMap.get(hash));

            await writeFile(join(this.#pocketPath, `${basename(romFile, extname(romFile))}.pocket`), patched);

            showProgress && progress.tick();
        }
    }
}

module.exports = RomPatcher;