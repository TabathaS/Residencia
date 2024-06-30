const express = require('express');  //biblioteca EXPRESS
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const wav = require('wav-decoder');
const bodyParser = require('body-parser');
const cors = require("cors"); // Importa el paquete CORS
const mysql = require("mysql2"); // importar biblioteca que permite la conexion entre servidor y base de datos 
const session = require('express-session');
const bcrypt = require('bcrypt'); // Importa bcrypt para hashing de contraseñas
const { authenticateUser } = require('./middleware/auth');

const app = express();
const port = process.env.PORT || 5001;

ffmpeg.setFfmpegPath(require('@ffmpeg-installer/ffmpeg').path);

// Configura Express para servir archivos estáticos desde la carpeta 'public'
app.use(express.static(path.join(__dirname, '../public'))); //Hace publica la carpeta 
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

// Configuración de express-session
app.use(session({
  secret: 'tu_secreto_aqui', // Cambia esto a una cadena de texto segura
  resave: false,
  saveUninitialized: true,
  cookie: { 
    secure: false,
    maxAge: 1000 * 60 * 15    // 15 minutos de inactividad permitida
  }
}));

// Configuración de Multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
         const uploadPath = path.join(__dirname, 'uploads');
    cb(null, uploadPath); // Directorio donde se almacenarán los archivos subidos
  },

    filename: function (req, file, cb) {
        cb(null,file.originalname); // Nombre de archivo único
    }
});

const upload = multer({ storage: storage });
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Servir la carpeta de uploads como estática

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
  connection.release(); // liberar la conexión
});

//RUTAS
// Para inicio de sesión
app.post('/login', (req, res) => {
  const { correo, contraseña } = req.body;

  // Verificar las credenciales en la base de datos
  pool.query('SELECT * FROM usuarios WHERE correo = ?', [correo], (err, results) => {
    if (err) {
      console.error('Error al buscar usuario:', err);
      res.status(500).send('Error al iniciar sesión');
    } else {
      const user = results[0];
      if (user && bcrypt.compareSync(contraseña, user.contraseña)) {
        // Usuario autenticado correctamente, redirigir a la página principal
        req.session.user = user;
        res.redirect('/inicio.html');
      } else {
        // Credenciales incorrectas
        res.status(401).json({ error: 'Credenciales incorrectas' });
      }
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


// Ruta para registrar un nuevo usuario
app.post('/registrar-usuario', (req, res) => {
  const { nombre, correo, contraseña, codigo } = req.body;

  if (codigo !== 'CC2024') {
    return res.status(400).json({ error: 'Código de verificación incorrecto' });
  }

  const hashedPassword = bcrypt.hashSync(contraseña, 10);

  pool.query('INSERT INTO usuarios (nombre, correo, contraseña) VALUES (?, ?, ?)', 
    [nombre, correo, hashedPassword], 
    (err, results) => {
      if (err) {
        console.error('Error al registrar el usuario:', err);
        return res.status(500).json({ error: 'Error al registrar el usuario' });
      }
      res.status(200).json({ message: 'Usuario registrado con éxito' });
    }
  );
});

// Rutas protegidas con authenticateUser
app.use(authenticateUser);

// Para registrar Paciente nuevo
app.post('/registrar-paciente', (req, res) => {
  const { nombre, fecha_nacimiento, genero, telefono, email, fecha_registro } = req.body;

  // Primero, verifica si el correo ya está registrado
  pool.query('SELECT email FROM pacientes WHERE email = ?', [email], (err, results) => {
    if (err) {
      console.error('Error al verificar el correo:', err);
      return res.status(500).json({ error: "Error al verificar el correo" });
    }
    if (results.length > 0) {
      // Si el correo ya está en uso, retorna un mensaje indicando esto
      return res.status(409).json({ error: "El correo electrónico ya está registrado" });
    } else {
      // Si no está en uso, procede a insertar el nuevo paciente
      pool.query('INSERT INTO pacientes (nombre, fecha_nacimiento, genero, telefono, email, fecha_registro) VALUES (?, ?, ?, ?, ?, ?)', 
      [nombre, fecha_nacimiento, genero, telefono, email, fecha_registro], (err, results) => {
        if (err) {
          console.error('Error al insertar en la base de datos:', err);
          return res.status(500).json({ error: "Error al insertar los datos" });
        } else {
          res.status(200).json({ message: "Paciente registrado con éxito" });
        }
      });
    }
  });
});

// consultar usuarios de la salud registrados
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

// Consultar pacientes
app.get('/consultar-pacientes', (req, res) => {
  pool.query('SELECT * FROM pacientes', (err, results) => {
    if (err) {
      console.error('Error al consultar la base de datos:', err);
      res.status(500).send('Error al consultar los datos');
    } else {
      console.log('Pacientes consultados con éxito');
      res.status(200).json(results);
    }
  });
});

// Consultar información de un paciente específico
app.get('/consultar-paciente/:id', (req, res) => {
    const pacienteId = req.params.id;
    pool.query('SELECT * FROM pacientes WHERE id = ?', [pacienteId], (err, results) => {
        if (err) {
            console.error('Error al consultar la base de datos:', err);
            res.status(500).send('Error al consultar los datos');
        } else {
            res.status(200).json(results[0]);
        }
    });
});


// POST para subir archivo específico para un paciente
app.post('/subir_archivo_px', upload.single('file'), (req, res) => {
  const { patientId, type } = req.body; // Datos recibidos del formulario
  const nombreArchivo = req.file.filename;
  const fechaSubida = new Date(); // Fecha actual

  console.log("Archivo recibido:", req.file);
  console.log("Datos recibidos:", req.body);

  // Inserta la información en la base de datos
  const sql = 'INSERT INTO archivos_paciente (id, nombre_archivo, tipo_archivo, fecha_subida) VALUES (?, ?, ?, ?)';
  pool.query(sql, [patientId, nombreArchivo, type, fechaSubida], (err, results) => {
    if (err) {
      console.error('Error al insertar en la base de datos:', err);
      res.status(500).send('Error al insertar los datos del archivo');
      return;
    } else {
      console.log('Archivo registrado con éxito:', results);
    }
  });
});

// Consultar archivos de un paciente
app.get('/consultar-archivos-paciente/:id', (req, res) => {
  const pacienteId = req.params.id;
  pool.query('SELECT * FROM archivos_paciente WHERE id = ?', [pacienteId], (err, results) => {
    if (err) {
      console.error('Error al consultar los archivos del paciente:', err);
      res.status(500).send('Error al consultar los archivos del paciente');
    } else {
      console.log('Archivos consultados con éxito');
      res.status(200).json(results);
    }
  });
});

// CONSULTAR ARCHIVOS ECG
app.get('/consultar-ecg-pacientes/:id', (req, res) => {
  const pacienteId = req.params.id;
  const tipo_Archivo = 'Electrocardiograma'; // Tipo de archivo a consultar

  pool.query(
    'SELECT * FROM archivos_paciente WHERE id_paciente = ? AND tipo_archivo = ?',
    [pacienteId, tipo_Archivo],
    (err, results) => {
      if (err) {
        console.error('Error al consultar los archivos de ECG:', err);
        res.status(500).send('Error interno del servidor');
        return;
      }
      res.json(results);
    }
  );
});

app.post('/subir-archivo', upload.single('archivo'), (req, res) => {
  const { id, tipo_archivo } = req.body; // Asumiendo que recibes el ID del paciente y el tipo del archivo
  const nombreArchivo = req.file.filename;
  const fechaSubida = new Date(); // Fecha actual

  const sql = 'INSERT INTO archivos_paciente (id_paciente, nombre_archivo, tipo_archivo, fecha_subida) VALUES (?, ?, ?, ?)';
  pool.query(sql, [id, nombreArchivo, tipo_archivo, fechaSubida], (err, results) => {
    if (err) {
      console.error('Error al insertar en la base de datos:', err);
      res.status(500).send('Error al insertar los datos del archivo');
    } else {
      console.log('Archivo registrado con éxito:', results);
      res.status(200).send('Archivo subido y registrado con éxito');
    }
  });
});

// Ruta para obtener comentarios de un archivo
app.get('/consultar-comentarios/:id_archivo', (req, res) => {
    const id_archivo = req.params.id_archivo;

    const query = `
        SELECT c.comentario, c.usuario, c.fecha 
        FROM comentarios c 
        WHERE c.id_archivo = ?
    `;

    pool.query(query, [id_archivo], (err, results) => {
        if (err) {
            console.error('Error al consultar comentarios:', err);
            return res.status(500).json({ error: 'Error al consultar comentarios' });
        }
        res.json(results);
    });
});


app.post('/agregar-comentario', (req, res) => {
    const { archivoId, comentario } = req.body;
    const usuario = req.session.user ? req.session.user.nombre : 'Anónimo'; // Asumiendo que el nombre de usuario está en la sesión

    const query = `
        INSERT INTO comentarios (id_archivo, usuario, comentario, fecha) 
        VALUES (?, ?, ?, NOW())
    `;

    console.log("Datos recibidos:", { archivoId, usuario, comentario });

    pool.query(query, [archivoId, usuario, comentario], (err, results) => {
        if (err) {
            console.error('Error al agregar comentario:', err);
            return res.status(500).json({ error: 'Error al agregar comentario' });
        }
        res.json({ message: 'Comentario agregado con éxito' });
    });
});

// Ruta para actualizar el perfil del paciente
app.put('/actualizar-paciente/:id', (req, res) => {
    const id = req.params.id;
    const { fecha_nacimiento, genero, telefono, email } = req.body;

    const query = `
        UPDATE pacientes 
        SET fecha_nacimiento = ?, genero = ?, telefono = ?, email = ? 
        WHERE id = ?
    `;

    pool.query(query, [fecha_nacimiento, genero, telefono, email, id], (err, results) => {
        if (err) {
            console.error('Error al actualizar el perfil del paciente:', err);
            return res.status(500).json({ error: 'Error al actualizar el perfil del paciente' });
        }
        res.json({ message: 'Perfil actualizado con éxito' });
    });
});

// Creacion de dirección para cada pestaña 
app.get('/formulario', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/formulario.html'));
});
app.get('/inicio.html', (req, res) => {
  if (req.session.user) {
    res.sendFile(path.join(__dirname, '../public/inicio.html'));
  } else {
    res.redirect('/login.html');
  }
});
app.get('/perfil.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/perfil.html'));
});
app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/login.html'));
});

app.listen(port, () => {
  console.log(`Servidor corriendo en el puerto ${port}`);
});
