const numbers = [1, 2, 3, 4, 5, 6];

// findLast() — зөвхөн Node 18+ дээр байдаг
const lastEven = numbers.findLast(n => n % 2 === 0);

console.log('Node version:', process.version);
console.log('Сүүлийн тэгш тоо:', lastEven);
