# Guía de Configuración – Cotizador CYC

## Paso 1 – Instalar Python

1. Ve a https://www.python.org/downloads/
2. Descarga Python 3.11 o superior (Windows: marcar "Add Python to PATH")
3. Instala con opciones por defecto

---

## Paso 2 – Logo de CYC

Copia tu archivo de logo con el nombre exacto **`logo.png`** dentro de la carpeta **`assets/`**.

```
cotizador-cyc/
  assets/
    logo.png   ← aquí
```

---

## Paso 3 – Configurar Google (Drive + Gmail)

> Esto toma unos 10 minutos y solo se hace una vez.

### 3.1 Crear proyecto en Google Cloud Console

1. Abre: https://console.cloud.google.com
2. En la parte superior, clic en **"Seleccionar proyecto"** → **"Nuevo proyecto"**
3. Nombre: `CotizadorCYC` → **Crear**
4. Asegúrate de tener seleccionado el proyecto creado

### 3.2 Activar las APIs necesarias

1. Menú lateral → **"APIs y servicios"** → **"Biblioteca"**
2. Busca **"Google Drive API"** → Clic → **"Habilitar"**
3. Vuelve a la Biblioteca
4. Busca **"Gmail API"** → Clic → **"Habilitar"**

### 3.3 Configurar pantalla de consentimiento OAuth

1. Menú lateral → **"APIs y servicios"** → **"Pantalla de consentimiento de OAuth"**
2. Tipo de usuario: **Externo** → **Crear**
3. Rellena:
   - Nombre de la app: `Cotizador CYC`
   - Correo de asistencia: `dtorres@tcyc.cl`
   - Correo del desarrollador: `dtorres@tcyc.cl`
4. Clic en **"Guardar y continuar"** (en los siguientes pasos también)
5. Al llegar a **"Usuarios de prueba"**, agrega: `dtorres@tcyc.cl`
6. Clic en **"Volver al panel"**

### 3.4 Crear credenciales OAuth

1. Menú lateral → **"APIs y servicios"** → **"Credenciales"**
2. Clic en **"+ Crear credenciales"** → **"ID de cliente de OAuth"**
3. Tipo: **"Aplicación de escritorio"**
4. Nombre: `Cotizador CYC Desktop`
5. Clic en **"Crear"**
6. En la ventana emergente, clic en **"Descargar JSON"**
7. Renombra el archivo descargado a exactamente **`credentials.json`**
8. Colócalo en la carpeta raíz del cotizador:

```
cotizador-cyc/
  credentials.json   ← aquí
  app.py
  run.bat
  ...
```

---

## Paso 4 – Primera ejecución

### Windows
Doble clic en **`run.bat`**

### Mac / Linux
```bash
chmod +x run.sh
./run.sh
```

Al abrir por primera vez con Google configurado:
1. Se abrirá una ventana del navegador pidiendo autorización
2. Selecciona tu cuenta `dtorres@tcyc.cl`
3. Puede aparecer una advertencia "Esta app no está verificada" → clic en **"Avanzado"** → **"Ir a CotizadorCYC"**
4. Acepta los permisos solicitados (Drive y Gmail)
5. ¡Listo! El archivo `token.json` se crea automáticamente y no volverás a ver esta pantalla

---

## Paso 5 – Uso diario

1. Doble clic en `run.bat` (Windows) o `./run.sh` (Mac)
2. Se abre automáticamente en el navegador: http://localhost:5000
3. Para cerrar: cierra la ventana de terminal (no el navegador)

---

## Estructura de archivos

```
cotizador-cyc/
├── app.py                  ← Servidor principal
├── config.py               ← Configuración (empresa, Drive, etc.)
├── database.py             ← Base de datos SQLite
├── pdf_generator.py        ← Generador de PDFs
├── google_services.py      ← Drive + Gmail
├── requirements.txt        ← Dependencias Python
├── run.bat                 ← Lanzador Windows
├── run.sh                  ← Lanzador Mac/Linux
├── GUIA_CONFIGURACION.md   ← Esta guía
├── credentials.json        ← TÚ COLOCAS ESTE ARCHIVO (paso 3.4)
├── token.json              ← Se crea automáticamente
├── cotizaciones.db         ← Base de datos (se crea automáticamente)
├── assets/
│   └── logo.png            ← TÚ COLOCAS ESTE ARCHIVO (paso 2)
└── templates/
    └── index.html          ← Interfaz web
```

---

## Solución de problemas

| Problema | Solución |
|---|---|
| "Python no encontrado" | Reinstala Python marcando "Add to PATH" |
| "credentials.json no encontrado" | Verifica que el archivo esté en la carpeta raíz |
| "Error de Gmail/Drive" | Elimina `token.json` y vuelve a ejecutar para re-autenticar |
| El navegador no abre | Abre manualmente http://localhost:5000 |
| Puerto 5000 ocupado | Cambia `port=5000` por `port=5001` en `app.py` |

---

## Cambiar datos de la empresa

Edita el archivo `config.py` con cualquier editor de texto (Notepad, VS Code, etc.)
y modifica la sección `COMPANY`.

---

*Sistema desarrollado para Transportes CYC Limitada – 2026*
