const express = require("express"); //biblioteca EXPRESS
const bodyParser = require("body-parser");
const cors = require("cors"); // Importa el paquete CORS
const path = require("path")
const mysql = require("mysql2"); // importar biblioteca que permite la conexion entre servidor y base de datos 
const multer = require("multer");
const session = require('express-session');
const { authenticateUser } = require('./middleware/auth');

//CAMBIO
const fs = require('fs');

//console.log(__dirname); //conocer la ruta en donde se encuentra el servidor 


//------------------------------------------------------------------------------------------

//-----------------------------------------------------------------------------
//-----------------------------------------------------------------------------
// Configuración de Multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      const uploadPath = path.join(__dirname, 'uploads');
      cb(null, uploadPath); // Directorio donde se almacenarán los archivos subidos
    },
    filename: function (req, file, cb) {
      cb(null, file.originalname); // Nombre del archivo en el servidor
    }
});

const upload = multer({ storage: storage });

//-----------------------------------------------------------------------------
// Configuración de la conexión a la base de datos MySQL
const pool = mysql.createPool({
    host: 'localhost', // Ejemplo: 'localhost'
    user: 'tabatha', // Ejemplo: 'root'
    password: 'Tabatha17@',
    database: 'telemed241',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Verificar conexión a la base de datos
pool.getConnection((err, connection) => {
    if (err) {
        console.error("No se pudo conectar a la base de datos:", err);
        return;
    }
    console.log("Conectado exitosamente a la base de datos");
    connection.release(); // No olvides liberar la conexión
});

const app = express();// APP DEL SERVER

//-----------------------------------------------------------------------------------------
// Configura Express para servir archivos estáticos desde la carpeta 'public'
app.use(cors());
app.use(express.static('public')); //Hace publica la carpeta 
//app.use(express.static(path.join(__dirname,'uploads')));
//Cambio 
app.use('/uploads', express.static(path.join(__dirname, 'server', 'uploads')));

app.use(bodyParser.json());
app.use(express.urlencoded({ extended:true }));
// Configuración de express-session
app.use(session({
  secret: 'tu_secreto_aqui', // Cambia esto a una cadena de texto segura
  resave: false,
  saveUninitialized: true,
   cookie: { 
        secure: false,
        maxAge: 1000 * 60 * 15    // 15 minutis de inactividad permitida
    }
}));


// Para inicio de sesión
app.post('/login', (req, res) => {
    const { correo, contraseña } = req.body;

    // Verificar las credenciales en la base de datos
    pool.query('SELECT * FROM usuarios WHERE correo = ? AND contraseña = ?', [correo, contraseña], (err, results) => {
        if (err) {
            console.error('Error al buscar usuario:', err);
            res.status(500).send('Error al iniciar sesión');
        } else {
          const user = results[0];
            if (results.length > 0) {
                // Usuario autenticado correctamente, redirigir a la página principal
                req.session.user = user;
                res.redirect('/inicio.html');
            } else {
                // Credenciales incorrectas
                res.status(401).send('Credenciales incorrectas');
            }
        }
    });
});

//-----------------------------------------------------------------------------
app.use(authenticateUser);
// Manejar una solicitud POST
app.post('/enviar-datos', (req, res) => {
    // Directamente usando req.body para obtener los valores
    const { nombre, correo, contraseña } = req.body;

// Ejecutar el query en una sola línea, pasando los valores directamente
    pool.query('INSERT INTO usuarios (nombre, correo, contraseña) VALUES (?, ?, ?)', [nombre, correo, contraseña], (err, results) => {
      if (err) {
        console.error('Error al insertar en la base de datos:', err);
        res.status(500).send('Error al insertar los datos');
      } else {
        console.log('Datos insertados con éxito:', results);
        res.status(200).send('Datos recibidos con éxito');
      }
    });
});


// Ruta para manejar la subida de archivos
app.post('/subir-archivo', upload.single('archivo'), (req, res) => {
  // Guardar información del archivo en la base de datos
  console.log("subiendo archivo...");
  const nombreArchivo = req.file.filename;
  const rutaArchivo = req.file.path;
  const tipoArchivo = req.file.mimetype;
  
  const sql = 'INSERT INTO archivos (nombre_archivo, ruta_archivo, tipo_archivo) VALUES (?, ?, ?)';
  pool.query(sql, [nombreArchivo, rutaArchivo, tipoArchivo], (err, results) => {
    if (err) {
      console.error('Error al insertar en la base de datos:', err);
      res.status(500).send('Error al insertar los datos');
    } else {
      console.log('Datos del archivo insertados con éxito:', results);
      res.status(200).send('Archivo subido y datos guardados con éxito');
    }
  });
});

app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error al cerrar la sesión: ' + err.message);
            res.status(500).send('Error en el servidor');
            return;
        }
        res.redirect('/login.html'); // Redirigir a la página de inicio o a donde desees después del logout
    });
});

// se consultan los datos 
app.get('/consultar', (req, res) => {
    pool.query('SELECT * FROM usuarios', (err, results) => {
        if (err) {
            console.error('Error al consultar la base de datos:', err);
            res.status(500).send('Error al consultar los datos');
        } else {
            console.log('Usuarios consultados con éxito');
            res.status(200).json(results);
        }
    });
});

//CONSULTAR ARCHIVOS
app.get('/consultararchivos', (req, res) => {
    pool.query('SELECT * FROM archivos', (err, results) => {
      if (err) {
        console.error('Error al consultar la base de datos:', err);
        res.status(500).send('Error al consultar los datos');
      } else {
        console.log('Archivos consultados con éxito');
        res.status(200).json(results);
      }
    });
  });

app.get('/audio/:filename', (req, res) => {
    const filename = req.params.filename;
    const audioPath = path.join(__dirname, 'server', 'uploads', filename);

    // Verifica si el archivo existe
    if (fs.existsSync(audioPath)) {
        res.sendFile(audioPath);
    } else {
        res.status(404).send('Archivo no encontrado');
    }
});

  app.get('/inicio.html', (req, res) => {
    if (req.session.user) {
      // Si el usuario ha iniciado sesión, envía el archivo index.html
      res.sendFile(path.join(__dirname, 'inicio.html'));
    } else {
      // Si el usuario no ha iniciado sesión, redirige a la página de inicio de sesión
      res.redirect('/login.html');
    }
});

app.get('/usuarios', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'usuarios.html'));
});
app.get('/subirarchivo', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public','subir_archivo.html'));
});
app.get('/archivos', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public','archivos.html'));
});
app.get('/formulario', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'formulario.html'));
});
app.get('/audio', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'audio.html'));
});
app.get('/grafica', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'graficar.html'));
});



app.listen(5001,function(){
    console.log("servidor corriendo en el puerto 5001");
});