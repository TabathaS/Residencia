// IMPORTACIÓN DE BIBLIOTECAS
const express = require('express');  //Para la creación de aplicaciones web
const multer = require('multer'); // Manejo de Archivos subidos
const path = require('path'); // Para manejar rutas de archivos y directorios
const ffmpeg = require('fluent-ffmpeg'); // Para trabajar en archivos multimedia
const bodyParser = require('body-parser'); // Para manejar el cuerpo de las solicitudes HTTP
const cors = require("cors"); // Para permitir solicitudes desde diferentes dominios
const mysql = require("mysql2"); // Permite la conexion entre servidor y base de datos 
const session = require('express-session');// Para manejar sesiones de usuario
const bcrypt = require('bcrypt'); // Para hashing de contraseñas
const { authenticateUser } = require('./middleware/auth'); // Para autenticación de usuarios
const {  exec, execFile  } = require('child_process'); // Importa datos para ejecutar comandos de shell

// CONFIGURACIÓN DE LA APLICACIÓN
const app = express(); // Crea una instancia de Express
const port = process.env.PORT || 5001; // Se define el puerto en el que correrá la aplicación
ffmpeg.setFfmpegPath(require('@ffmpeg-installer/ffmpeg').path); // Configura el camino de FFmpeg

// MIDDLEWARE
app.use(express.static(path.join(__dirname, '../public'))); //Hace publica la carpeta 
app.use(bodyParser.json());  // Middleware para parsear cuerpos de solicitudes en formato JSON
app.use(bodyParser.urlencoded({ extended: true })); // Middleware para parsear cuerpos de solicitudes con datos codificados en URL
app.use(cors()); // Middleware para permitir solicitudes desde diferentes dominios

// CONFIGURACIÓN DE SESIONES
app.use(session({
  secret: 'tu_secreto_aqui', // Cambia esto a una cadena de texto segura
  resave: false,
  saveUninitialized: true,
  cookie: { 
    secure: false,
    maxAge: 1000 * 60 * 15    // 15 minutos de inactividad permitida
  }
}));

// CONFIGURACIÓN DE MULTER
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

// CONFIGURACIÓN DE LA CONEXIÓN A LA BASE DE DATOS MySQL
const pool = mysql.createPool({
  host: 'localhost', 
  user: 'tabatha', 
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

//RUTAS PARA AUTENTICACIÓN
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

// Registrar un nuevo usuario
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


app.use(authenticateUser); // Se protegen las rutas

// Registrar nuevo paciente
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

// RUTAS PARA CONSULTAR DATOS
// Usuarios de la salud registrados
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

// Pacientes
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

// Información de un paciente específico
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

//RUTAS PARA MANEJO DE ARCHIVOS
// Subir archivo específico para un paciente
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
      res.status(200).json({ success: true, message: 'Archivo subido con éxito' });
    }
  });
});

// Consultar archivos de un paciente
app.get('/consultar-archivos-paciente/:id', (req, res) => {
  const pacienteId = req.params.id;
  pool.query('SELECT * FROM archivos_paciente WHERE id = ? AND nombre_archivo NOT LIKE "%.hea"', [pacienteId], (err, results) => {
    if (err) {
      console.error('Error al consultar los archivos del paciente:', err);
      res.status(500).send('Error al consultar los archivos del paciente');
    } else {
      console.log('Archivos consultados con éxito');
      res.status(200).json(results);
    }
  });
});

// Obtener comentarios de un archivo
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

//Agregar comentario a un archivo 
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

// Actualizar el perfil del paciente
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

//RUTAS PARA PROCESAMIENTO DE ARCHIVOS
app.get('/obtener-datos-fonocardiograma/:nombre_archivo', (req, res) => {
  const nombreArchivo = req.params.nombre_archivo; // Extrae el parámetro nombre_archivo de la URL
  const filePath = path.join(__dirname, 'uploads', nombreArchivo); // Ajusta la ruta según tu estructura de archivos

    // Ruta absoluta al archivo process_audio.py
    const scriptPath = path.join(__dirname, 'process_audio.py');

    exec(`python3 ${scriptPath} ${filePath}`,  {maxBuffer: 1024 * 1024* 10 } ,(error, stdout, stderr) => {// Aumenta el tamaño del buffer a 1MB
        if (error) {
            console.error(`Error ejecutando el script Python: ${error.message}`);
            return res.status(500).json({ error: 'Error procesando el archivo .mp3' });
        }
        if (stderr) {
            console.error(`Error en el script Python: ${stderr}`);
            return res.status(500).json({ error: 'Error procesando el archivo .mp3' });
        }
        res.status(200).json(JSON.parse(stdout));
    });
});

app.get('/obtener-datos-electrocardiograma/:nombre_archivo', (req, res) => {
  const nombreArchivo = req.params.nombre_archivo;
  const filePath = path.join(__dirname, 'uploads', nombreArchivo);
  const scriptPath = path.join(__dirname, 'process_ecg.py');

    execFile('python3', [scriptPath, filePath], { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error ejecutando el script Python: ${error.message}`);
            return res.status(500).json({ error: 'Error al procesar el archivo .dat' });
        }
        if (stderr) {
            console.error(`Error en el script Python: ${stderr}`);
            return res.status(500).json({ error: 'Error al procesar el archivo .dat' });
        }

        try {
            console.log(stdout);
            const data = JSON.parse(stdout);
            res.json(data);
        } catch (parseError) {
            console.error(`Error al parsear la salida del script Python: ${parseError.message}`);
            res.status(500).json({ error: 'Datos inválidos recibidos del servidor' });
        }
    });
});

// RUTAS PARA SERVIR ARCHIVOS HTML
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

//INICIALIZACIÓN DEL SERVIDOR
app.listen(port, () => {
  console.log(`Servidor corriendo en el puerto ${port}`);
});
