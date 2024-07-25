# CardioCloud: Plataforma Web para Almacenamiento y Consulta de Señales Cardiacas

## Descripción

CardioCloud es una plataforma web desarrollada para el almacenamiento y consulta de señales cardiacas, específicamente electrocardiogramas (ECG) y fonocardiogramas (FCG). Este proyecto se llevó a cabo en el Instituto Tecnológico de Tijuana como parte de la Residencia Profesional. La plataforma está diseñada para mejorar el acceso a diagnósticos médicos en zonas aisladas, donde el acceso a especialistas es limitado.

## Características

- **Inicio de Sesión y Registro de Usuarios**: Los usuarios pueden iniciar sesión o registrarse, ingresando su nombre, correo electrónico, contraseña y, en caso de ser médico, un código de verificación.
- **Gestión de Pacientes**: Permite registrar pacientes y gestionar sus datos personales.
- **Subida de Archivos**: Los usuarios pueden subir archivos de tipo ECG (.dat) y FCG (.mp3) para su análisis.
- **Visualización de Datos**: Muestra gráficas de los datos cardiacos y permite añadir comentarios.
- **Interfaz Adaptativa**: La plataforma se adapta a diferentes tamaños de pantalla para una mejor experiencia de usuario.

## Tecnologías Utilizadas

- **Frontend**: HTML, CSS, JavaScript, Bootstrap
- **Backend**: Node.js, Express
- **Base de Datos**: MySQL
- **Cloud Storage**: Google Cloud

## Capturas de Pantalla

1. **Inicio de Sesión**
   - Pantalla completa con usuario y contraseña ocultos.
   - Pantalla reducida con diseño adaptativo y botón de ver contraseña.

2. **Registro de Usuarios**
   - Formulario de registro para nuevos usuarios, incluyendo médicos con código de verificación.

3. **Pantalla de Inicio**
   - Tabla de pacientes registrados y botón de búsqueda para localizar pacientes específicos.

4. **Registro de Pacientes**
   - Formulario de registro de pacientes con validación de campos obligatorios.

5. **Subida de Archivos**
   - Ventana emergente para subir archivos ECG y FCG.
   - Selección de archivos desde la computadora.

6. **Perfil de Paciente**
   - Edición de datos personales y visualización de archivos correspondientes al paciente.

7. **Visualización de Archivos**
   - Gráficas de datos ECG con espacio para comentarios e historial de comentarios.
   - Gráficas de datos FCG con audio mp3 y comentarios.
