#!/usr/bin/env node
'use strict';

(async (argv, defaults, usage) => {
    const
        {promises: {rm, access, mkdir}, constants: {R_OK, F_OK, W_OK}} = require('fs'),
        {join, resolve} = require('path'),
        {bin, config, version: ver} = require(join(__dirname, 'package.json')),
        {tmpDir, pocketDir, romSrc, progress, help, version} = {...defaults, ...argv},
        romsPaths = (Array.isArray(romSrc) ? romSrc : [romSrc]).map(path => resolve(path)),
        pocketPath = Array.isArray(pocketDir) || pocketDir === null ? null : resolve(pocketDir),
        tmpPath = Array.isArray(tmpDir) || tmpDir === null ? join(__dirname, 'tmp') : resolve(tmpDir),
        showProgress = !!progress,
        name = Object.keys(bin),
        cmd = `${name} v${ver}`;

    if (version) {
        console.log(`${cmd}`);
        process.exit(0);
    } else if (pocketPath === null || romsPaths.length === 0 || help) {
        usage(cmd, name, tmpPath);
        process.exit(help ? 0 : 1);
    }

    try {
        await mkdir(pocketPath, {recursive: true});
        await mkdir(tmpPath, {recursive: true});

        await access(tmpPath, F_OK | W_OK | R_OK);
        await access(pocketPath, F_OK | W_OK);

        for await (let src of romsPaths) {
            await access(src, F_OK | R_OK);
        }

        const
            Scanner = require('./src/Scanner'),
            PocketSourceParser = require('./src/PocketSourceParser'),
            RomPatcher = require('./src/RomPatcher'),
            Progress = require('./src/ProgressBar'),
            parser = new PocketSourceParser(config.sources),
            scanner = new Scanner(tmpPath, romsPaths),
            patcher = new RomPatcher(pocketPath),
            patches = (await parser.parse(showProgress)).filter(({name, hash, patch}) => [
                PocketSourceParser.validPatch({name, hash, patch}),
                hash.length === 1,
                patch.length === 1,
                patch[0].toLowerCase().endsWith('.ips')
            ].every(Boolean)),
            patchMap = patches.reduce((p, c) => p.set(c.hash[0], c.patch[0]), new Map()),
            romsMap = await scanner.scan(patchMap, showProgress);

        await patcher.applyPatches(romsMap, patchMap, showProgress);

        Progress.printFixedWidthString('Patches applied', romsMap.size, 'of', patchMap.size);
    } catch (err) {
        console.error(err.message);
    } finally {
        await rm(tmpPath, {recursive: true, force: true, maxRetries: 10, retryDelay: 250});
    }
})(
    require('yargs-parser')(process.argv.slice(2)),
    {progress: true, pocketDir: null, tmpDir: null, romSrc: []},
    (cmd, name, tmpPath) => {
        console.log(cmd, '\n');
        console.log(`Usage: ${name} [options]`, '\n');
        console.log(`Options:`);
        console.log(`    --tmpDir      <directory> for temporary rom backup [default: ${tmpPath}]`);
        console.log(`    --romSrc      <directory> or <zip file> to scan for *.gb/*.gbc files                  [array] [required]`);
        console.log(`    --pocketDir   <directory> to write *.pocket files                                             [required]`);
        console.log(`    --progress    Show progress [default: true]                                                    [boolean]`);
        console.log(`    --version     Show version                                                                     [boolean]`);
        console.log(`    --help        Show help                                                                        [boolean]`);
        console.log('');
    }
);
