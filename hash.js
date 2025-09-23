const bcrypt = require('bcryptjs');

const password = "admin123";  // <-- change to your desired password
const hash = bcrypt.hashSync(password, 10);

console.log("Hashed password:", hash);
