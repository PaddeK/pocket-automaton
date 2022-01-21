'use strict';

const
    {createHash} = require('crypto'),
    md5 = data => createHash('md5').update(data).digest('hex'),
    AdmZip = require('adm-zip'),
    readdirp = require('readdirp'),
    {stat, readFile, writeFile, copyFile} = require('fs/promises'),
    {join, extname, basename, sep, posix: {sep: posixSep}} = require('path'),
    ProgressBar = require('./ProgressBar'),
    PathProgressBar = ProgressBar('Scanning rom paths'),
    ZipProgressBar = ProgressBar('Scanning zip files'),
    RomProgressBar = ProgressBar('Scanning found roms'),
    extZip = '.zip',
    extRom = ['.gb', '.gbc'],
    exts = extRom.concat(extZip),
    isValidExt = file => exts.includes(extname(file).toLowerCase()),
    isZip = file => extname(file).toLowerCase() === extZip,
    isRom = file => extRom.includes(extname(file).toLowerCase()),
    readdirpOpts = {fileFilter: exts.map(ext => `*${ext}`), alwaysStat: false, depth: Infinity};

class Scanner
{
    #romPaths;
    #tmpDir;

    constructor (tmpDir, romPaths)
    {
        this.#tmpDir = tmpDir;
        this.#romPaths = romPaths;
    }

    async #scanRomPaths (showProgress = true)
    {
        const
            files = [],
            progress = PathProgressBar.init(this.#romPaths.length);

        for await (const romPath of this.#romPaths) {
            if ((await stat(romPath)).isDirectory()) {
                for await (const entry of readdirp(romPath, readdirpOpts)) {
                    files.push(entry.fullPath);
                }
            } else {
                isValidExt(romPath) && files.push(romPath);
            }
            showProgress && progress.tick();
        }

        return files;
    }

    async #getRomCount (files, showProgress = true)
    {
        const progress = ZipProgressBar.init(files.length);

        return files.reduce((count, file) => {
            showProgress && progress.tick();
            return count += isZip(file) ? new AdmZip(file).getEntries().filter(entry => isRom(entry.name)).length : 1;
        }, 0);
    }

    async #scanRoms (patchMap, files, total, showProgress = true)
    {
        const
            map = new Map(),
            progress = RomProgressBar.init(total);

        for await (const file of files) {
            if (isZip(file)) {
                const zip = new AdmZip(file);

                zip.getEntries().forEach(entry => {
                    if (isRom(entry.name)) {
                        const
                            data = entry.getData(),
                            hash = md5(data);

                        if (patchMap.has(hash) && !map.has(hash)) {
                            zip.extractEntryTo(entry, this.#tmpDir, false, true);
                            map.set(hash, join(this.#tmpDir, entry.name));
                        }
                        showProgress && progress.tick();
                    }
                });
            } else {
                const
                    data = await readFile(file),
                    hash = md5(data);

                if (patchMap.has(hash) && !map.has(hash)) {
                    await copyFile(file, join(this.#tmpDir, basename(file)));
                    map.set(hash, join(this.#tmpDir, basename(file)));
                }
                showProgress && progress.tick();
            }
        }

        return map;
    }

    async scan (patchMap, showProgress = true)
    {
        const
            files = await this.#scanRomPaths(showProgress),
            count = await this.#getRomCount(files, showProgress);

        return this.#scanRoms(patchMap, files, count, showProgress);
    }
}

module.exports = Scanner;