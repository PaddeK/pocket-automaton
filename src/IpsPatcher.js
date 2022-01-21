'use strict';

const
	IPS_MAGIC_HEADER = Buffer.from('PATCH'),
	IPS_MAGIC_TAIL = Buffer.from('EOF');

class IpsPatcher
{
	static apply (source, patch, name)
	{
		let index = 0;
		const
			target = Buffer.from(source),
			header = patch.slice(0, index += 5);

		if (!header.equals(IPS_MAGIC_HEADER)) {
			throw new Error('Invalid IPS file');
		}

		while (index < patch.length) {
			const hunkStart = patch.slice(index, index += 3);

			if (hunkStart.equals(IPS_MAGIC_TAIL)) {
				break;
			}

			const
				offset = hunkStart.readUIntBE(0, hunkStart.length),
				lengthBytes = patch.slice(index, index += 2),
				length = lengthBytes.readUIntBE(0, lengthBytes.length);

			if (length) {
				patch.slice(index, index += length).copy(target, offset);
			} else {
				const
					runLength = patch.slice(index, index += 2).readUIntBE(0, 2),
					payload = patch.slice(index, index += 1).readUIntBE(0, 1);

				Buffer.alloc(runLength, payload).copy(target, offset);
			}
		}

		return target;
	}

}

module.exports = IpsPatcher;