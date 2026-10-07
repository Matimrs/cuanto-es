## CASTELLANO

# Distribution App

Bienvenido a Distribution, una aplicación web desarrollada por Matias Morales.

## Descripción
Distribution es una aplicación que se encarga de distribuir equitativamente los gastos entre 2 o más personas. Fue desarrollada con React y JavaScript, utilizando Bulma para los estilos. Este proyecto fue creado con el objetivo de profundizar los conocimientos sobre React.

## Información del Desarrollador
- **Nombre:** Matias Morales
- **Edad:** 20 años
- **Pais:** Argentina
- **Estudiante de:** Ingeniería en Sistemas de Información en UTN FRSF
- **Cursando:** 3er Año
- **Experiencia:** Desarrollador Full Stack con MERN stack

## Cómo usar
1. Clona este repositorio: `git clone https://github.com/tu-usuario/tu-repositorio.git`
2. Instala las dependencias: `npm install`
3. Inicia la aplicación: `npm start`
4. Accede a la aplicación desde tu navegador: [http://localhost:3000](http://localhost:3000)

También puedes acceder a la aplicación en línea: [Distribution App](https://distributionm.netlify.app/)

¡Disfruta de Distribution!

## Backend (server/)

API de CuantoEs (Node + Express + Prisma + PostgreSQL). Expone la autenticación (`/auth/*`) y
la gestión de grupos, miembros, categorías, gastos y liquidaciones (`/groups/*`). Las
liquidaciones se calculan con el mismo algoritmo de la app (`src/utils/calculate.js`).

### Requisitos

- Docker Desktop (con Docker Compose v2).
- Node.js 24 o superior y npm, solo para correr los tests o el servidor fuera de Docker.

### Levantar el backend

1. Crear la configuración local a partir del ejemplo (`server/.env` nunca se commitea):

   ```bash
   cp server/.env.example server/.env
   ```

2. Completar `JWT_SECRET` en `server/.env` con al menos 32 caracteres aleatorios. Para generarlos:

   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
   ```

3. Levantar la base de datos y la API en un solo paso (aplica las migraciones al arrancar):

   ```bash
   docker compose up --build
   ```

   La API queda en <http://localhost:3001>. Para probarla:

   ```bash
   curl -X POST http://localhost:3001/auth/register -H "Content-Type: application/json" \
     -d '{"name":"Ana","email":"ana@ejemplo.com","password":"secreta123"}'
   ```

> **Puerto 5432 ocupado** (por ejemplo, por otro Postgres): levantar con
> `DB_HOST_PORT=5433 docker compose up --build` y cambiar `localhost:5432` por `localhost:5433`
> en `DATABASE_URL` y `TEST_DATABASE_URL` de `server/.env`.

### Tests

Con el contenedor `db` levantado (`docker compose up -d db`):

```bash
npm install          # en la raíz: el cálculo usa src/utils/calculate.js, que importa `uuid`
cd server
npm install
npm test
```

Los tests usan una base aparte, `cuantoes_test`, que se crea sola la primera vez que se
inicializa el volumen. Si el volumen es anterior y la base no existe:

```bash
docker compose exec db createdb -U cuantoes cuantoes_test
```

Guía completa y escenarios de prueba manual:
[specs/001-backend-auth-base/quickstart.md](specs/001-backend-auth-base/quickstart.md).


## ENGLISH    

# Distribution App

Welcome to Distribution, a web application developed by Matias Morales.

## Description
Distribution is an application that fairly distributes expenses among 2 or more people. It was developed with React and JavaScript, using Bulma for styles. This project was created with the goal of deepening knowledge about React.

## Developer Information
- **Name:** Matias Morales
- **Age:** 20 years old
- **Country:** Argentina 
- **Student at:** Information Systems Engineering at UTN FRSF
- **Currently in**: 3rd Year
- **Experience:** Full Stack Developer with MERN stack

## How to Use
1. Clone this repository: `git clone https://github.com/your-username/your-repository.git`
2. Install dependencies: `npm install`
3. Start the application: `npm start`
4. Access the application from your browser: [http://localhost:3000](http://localhost:3000)

You can also access the online application: [Distribution App](https://distributionm.netlify.app/)

Enjoy Distribution!