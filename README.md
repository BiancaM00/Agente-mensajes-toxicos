# Agente Moderador RAU

Agente inteligente para la moderación de mensajes en foros académicos. Analiza las publicaciones de los estudiantes, identifica posibles mensajes tóxicos y determina acciones de moderación según el contenido y el historial de comportamiento.

Proyecto de Inteligencia Artificial, NRC 1228 – Universidad Tecnológica de Bolívar.

## 1. Objetivo

Promover una comunicación respetuosa en los foros académicos mediante un agente inteligente que apoye la detección y moderación de mensajes inadecuados, sin impedir la expresión de críticas académicas respetuosas.

## 2. Arquitectura y funcionamiento

El agente sigue este flujo:

Percibir → Normalizar → Clasificar → Recordar → Decidir → Actuar → Aprender.

- **Percepción:** recibe el mensaje publicado por el estudiante.
- **Normalización:** prepara el texto para su análisis.
- **Clasificación:** analiza el contenido mediante los componentes de procesamiento de lenguaje natural.
- **Memoria:** consulta el historial y las reincidencias del estudiante.
- **Decisión:** evalúa el resultado y determina la acción correspondiente.
- **Acción:** permite publicar, advertir, solicitar una reescritura o retener el mensaje para revisión docente, según las reglas implementadas.
- **Aprendizaje:** registra las decisiones y permite considerar la retroalimentación docente.

## 3. Funcionalidades

- Análisis automático de mensajes.
- Detección de contenido potencialmente tóxico.
- Tratamiento de amenazas y reincidencias.
- Diferenciación entre críticas respetuosas y mensajes ofensivos.
- Aplicación de acciones de moderación.
- Registro persistente de decisiones.
- Historial de decisiones del agente.
- Notificaciones relacionadas con la moderación.
- Métricas para el seguimiento de la actividad del agente.
- Control de acceso según roles y permisos.

## 4. Tecnologías

- Python.
- FastAPI.
- SQLAlchemy.
- MySQL.
- Alembic.
- React y Vite.
- Hugging Face Transformers.
- Pytest.

## 5. Instalación y ejecución

### Backend

Crear y activar el entorno virtual:

```bash
python -m venv venv
venv\Scripts\activate
```

Instalar dependencias:

```bash
pip install -r requirements.txt
```

Configurar las variables de entorno utilizando `.env.example` como referencia y completar los valores correspondientes.

Ejecutar el servidor:

```bash
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## 6. Documentación de la API

Con el backend en ejecución, consultar:

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

Allí se pueden consultar los endpoints disponibles, sus parámetros y respuestas.

## 7. Pruebas automatizadas

Ejecutar la suite de pruebas:

```bash
python -m pytest -q
```

Durante la validación del proyecto se obtuvo un resultado de 18 pruebas aprobadas.

## 8. Equipo de desarrollo

| Integrante | Responsabilidad |
|---|---|
| Ana Cerro Pérez | Núcleo del agente y backend |
| Sara Vargas Vasquez | Percepción y procesamiento NLP |
| Sofía Mejía González | Interfaz del agente |
| Bianca Mastrascusa Camargo | Datos, evaluación y aprendizaje |

**Docente:** Yuranis Henriquez Núñez.

**Institución:** Universidad Tecnológica de Bolívar.

**Asignatura:** Inteligencia Artificial – NRC 1228.
