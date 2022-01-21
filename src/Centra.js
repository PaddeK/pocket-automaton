'use strict';

const CentraRequest = require('centra/model/CentraRequest');

class Request extends CentraRequest
{
    #followRedirect;

    constructor (url, method = 'GET', opts = {followRedirect: 5}) {
        super(url, method);

        this.#followRedirect = opts?.followRedirect ?? 0;
    }

    async #send (send, max)
    {
        const response = await send();

        if (max && [301, 302, 307, 308].includes(response.statusCode) && response.headers.location) {
            this.url = new URL(response.headers.location);
            return this.#send(send, --max);
        }

        return response;
    }

    send ()
    {
        const realSend = CentraRequest.prototype.send.bind(this);

        return this.#followRedirect === 0 ? realSend() : this.#send(realSend, this.#followRedirect);
    }
}

module.exports = (url, method = 'GET', opts = {followRedirect: 5}) => {
	return new Request(url, method, opts);
};
