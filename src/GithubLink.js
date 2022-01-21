'use strict';

const
    RAW_HOSTNAME = 'raw.githubusercontent.com',
    HOSTNAMES = ['github.com', RAW_HOSTNAME],
    {dirname, basename, extname, posix: {join}} = require('path'),
    cmp = (a, b) => a?.localeCompare?.(b, undefined, {sensitivity: 'accent'}) === 0;

class GithubLink
{
    #origin;
    #user;
    #repo;
    #view;
    #branch;
    #file;
    #valid;
    #rawUrl;

    constructor (url)
    {
        try {
            const
                {hostname, origin, pathname} = new URL(url),
                [user, repo, view, branch] = dirname(pathname).split('/').slice(1),
                file = basename(pathname),
                isRaw = cmp(RAW_HOSTNAME, hostname);

            this.#rawUrl = isRaw;
            this.#valid = HOSTNAMES.some(name => cmp(name, hostname));
            this.#origin = origin;
            this.#user = user;
            this.#repo = repo;
            this.#view = isRaw ? '' : view;
            this.#branch = isRaw ? view : branch;
            this.#file = file;
        } catch (err) {
            this.#valid = false;
        }
    }

    get user ()
    {
        return this.#user;
    }

    get repo ()
    {
        return this.#repo;
    }

    static #buildUrl (origin, ...path)
    {
        const url = new URL(origin);

        url.pathname = join(...path);
        return url.href;
    }

    is (user, repo, ext)
    {
        if (!this.#valid) {
            return false;
        }

        return [
            cmp(this.#user, user),
            cmp(this.#repo, repo),
            (Array.isArray(ext) ? ext : [ext]).some(e => cmp(extname(this.#file), e))
        ].every(Boolean);
    }

    toDownloadLink ()
    {
        if (!this.#valid) {
            return;
        }

        const parts = [this.#user, this.#repo, this.#rawUrl ? '' : 'raw', this.#branch, this.#file];

        return GithubLink.#buildUrl(this.#origin, ...parts);
    }

    toString ()
    {
        return {
            origin: this.#origin,
            rawUrl: this.#rawUrl,
            valid: this.#valid,
            user: this.#user,
            repo: this.#repo,
            view: this.#view,
            branch: this.#branch,
            file: this.#file
        }
    }
}

module.exports = GithubLink;