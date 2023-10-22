function serialize(values, sizes) {
	const bytes = Math.ceil(sizes.reduce((a, b) => a + b) / 8);
	let arr = new Array(bytes);
	let offset = 0;
	for (let i = 0; i < values.length; i++) {
		let leftInValue = sizes[i];
		let value = values[i];

		do {
			let byteOffset = offset % 8;
			const leftInByte = 8 - byteOffset;

			const idx = Math.floor(offset / 8);
			arr[idx] |= (value & (2 ** leftInByte - 1)) << Math.max(0, leftInByte - leftInValue);
			value >>= leftInByte;

			offset += Math.min(leftInValue, leftInByte);
			leftInValue -= leftInByte;
		} while (leftInValue > 0);
	}
	return Uint8Array.from(arr);
}

function deserialize(bytes, sizes) {
	const values = new Array(sizes.length);
	let offset = 0;
	for (let i = 0; i < sizes.length; i++) {
		let leftInValue = sizes[i];
		let valueOffset = 0;

		do {
			let byteOffset = offset % 8;
			const leftInByte = 8 - byteOffset;

			const len = Math.min(leftInValue, leftInByte);

			const idx = Math.floor(offset / 8);
			values[i] |= ((bytes[idx] >> Math.max(0, leftInByte - leftInValue)) & (2 ** len - 1)) << valueOffset;
			valueOffset += len;

			offset += len;
			leftInValue -= len;
		} while (leftInValue > 0);
	}
	return values;
}

module.exports = { serialize, deserialize };