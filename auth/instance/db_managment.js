

const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");
let sql;


const db = new sqlite3.Database("/home/server/Desktop/fishflix/fishflix/auth/instance/auth.db", sqlite3.OPEN_READWRITE, // CONNECTS TO THE DB
    (err) => {if (err) return console.error(err.message)} 
); 

db.run("PRAGMA foreign_keys = ON");

const getHashedPassword = async (password) => {
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(password, salt);
    

    return hashedPassword;
}




const insertUser = async (username, password) => {
    try {
        const hashedPassword = await getHashedPassword(password); // Ensure the password is hashed before insertion

        const sql = "INSERT INTO users(username, password) VALUES (?, ?)";
        db.run(sql, [username, hashedPassword], // Now inserting the actual hashed password
            (err) => {
                if (err) return console.error(err.message);
                console.log("Successfully inserted user with hashed password.");
            }
        );
    } catch (error) {
        console.error("Error hashing password or inserting user:", error);
    }
}

// Example usage
//insertUser("rune", "Laksen2024");

//db.run(`CREATE TABLE rpi_stats(
//    id INTEGER PRIMARY KEY AUTOINCREMENT, 
//    rpi_con_id INTEGER, 
//    cpu_usage FLOAT, 
//    cpu_temp FLOAT, 
//    mem_usage FLOAT, 
//    network_usage FLOAT, 
//    psu_watts FLOAT, 
//    uptime TEXT,
//    date TEXT,
//    FOREIGN KEY(rpi_con_id) REFERENCES camera_connections(id)
//)`);

//db.run("CREATE TABLE sensors(id INTEGER PRIMARY KEY, rpi_con_id INTEGER, sens_name TEXT, sens_value TEXT, date TEXT, FOREIGN KEY(rpi_con_id) REFERENCES camera_connections(id))"); // MAKES THE DB TABL    E
//db.run("DROP TABLE sensors"); // REMOVES THE TABLE

//sql = "INSERT INTO users(first_name, last_name, user_name) VALUES (?, ?, ?)";
//db.run(sql, ["Petter", "Pfalzer", "tissefant123"],  // INSERTS DATA INTO THE DB
//    (err) => {if (err) return console.error(err.message)}
//);

sql = "SELECT * FROM camera_connections"; 
db.all(sql, [], 
    (err, rows) => {if (err) return console.error(err.message)
    rows.forEach(row => {
        console.log(row);
    });

});


//sql = "UPDATE camera_connections SET is_connected = ? WHERE id = ?";
//db.run(sql, [1, 6], 
//    (err) => {if (err) return console.error(err.message)
//});

//sql = "DELETE FROM users WHERE id=?";
//db.run(sql, [5], 
//    (err) => {if (err) return console.error(err.message)
//});



