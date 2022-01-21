'use strict';

const
    MD5_RGX = /^(?:MD5:[^0-9a-f]*?)?[0-9a-f]{32}[^0-9a-f]*?$/i,
    {Lexer} = require('marked'),
    {JSONPath} = require('jsonpath-plus'),
    ProgressBar = require('./ProgressBar')('Scanning ips sources'),
    GithubLink = require('./GithubLink'),
    centra = require('./Centra');

class PocketSourceParser
{
    #sources;

    constructor (sources)
    {
        this.#sources = sources;
    }

    static downloadLink (src, urls)
    {
        if (src.type === 'gist') {
            return urls.map(url => {
                const {origin, hostname, pathname} = new URL(url);

                if (hostname === 'shareit.bestpig.fr') {
                    const
                        newUrl = new URL(origin),
                        [_, hash, file] = pathname.split('/').slice(1);

                    newUrl.pathname = ['get', hash, file].join('/');

                    return newUrl.href;
                }
                return url;
            });
        }

        return urls.map(url => new GithubLink(url).toDownloadLink());
    }

    static async parseSource (src, debug = false)
    {
        let
            state = {name: false, hash: false, patch: false},
            tmp = {},
            patches = [];
        const
            md = await centra(src.markdown).send(),
            githubUrl = new GithubLink(src.markdown),
            extractMD5 = strs => strs.map(str => str.replace(/^.*?([a-f0-9]{32}).*?$/i, '$1').toLowerCase()),
            jsonPathOpts = {
                wrap: false,
                sandbox: {
                    md5: MD5_RGX,
                    githubURL: str => new GithubLink(str).is(githubUrl.user, githubUrl.repo, ['.zip', '.ips'])
                }
            },
            tokens = Lexer.lex(await md.text());

        for (let skipped = false, i = 0; i < tokens.length; i++) {
            const
                opts = {...jsonPathOpts, json: {tokens: [tokens[i]]}},
                parts = [src.name, src.hash, src.patch, src.skip],
                [isName, isHash, isPatch, isSkip] = parts.map(path => path ? JSONPath({...opts, path}) : true);

            debug && console.log(isName, isHash, isPatch, isSkip, skipped, tokens[i]);

            if (!isSkip && !skipped) {
                continue;
            } else {
                skipped = true;
            }

            if (isName) {
                state.name = true;
                tmp.name = isName.pop();
            }

            if (isHash) {
                state.hash = true;
                tmp.hash = tmp.hash ? [].concat(tmp.hash, extractMD5(isHash)) : extractMD5(isHash);
            }

            if (isPatch) {
                const link = PocketSourceParser.downloadLink(src, isPatch);
                state.patch = true;
                tmp.patch = tmp.patch ? [].concat(tmp.patch, link) : link;
            }

            if (state.name && state.patch && state.hash) {
                patches.push(tmp);
                tmp = {};
                state = {name: false, hash: false, patch: false};
            }
        }

        return patches.concat(tmp.name && tmp.hash && tmp.patch ? tmp : []);
    }

    static validPatches (patches)
    {
        return patches.every(PocketSourceParser.validPatch);
    }

    static validPatch (patch)
    {
        return [
            typeof patch.name === 'string' && patch.name.length,
            Array.isArray(patch.hash) && patch.hash.length,
            Array.isArray(patch.patch) && patch.patch.length
        ].every(Boolean);
    }

    async parse (showProgress = true)
    {
        const
            progress = ProgressBar.init(this.#sources.length),
            result = await Promise.all(this.#sources.map(source => {
                const error = `Source ${source.markdown} contains some errors`;

                return new Promise(resolve => {
                    PocketSourceParser.parseSource(source).then(patches => {
                        showProgress && progress.tick();
                        PocketSourceParser.validPatches(patches) === false && progress.interrupt(error);
                        resolve(patches);
                    });
                })
            }));

        return result.flat();
    }
}

module.exports = PocketSourceParser;