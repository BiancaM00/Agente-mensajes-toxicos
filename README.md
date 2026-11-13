# Agente Moderador RAU

Agente inteligente que analiza cada mensaje antes de publicarlo en los foros académicos y decide qué hacer: **publicar, publicar con aviso, pedir reescritura o retener para revisión del docente**. Recuerda el historial de cada estudiante y aprende de las decisiones del docente.

Proyecto final de **Inteligencia Artificial (NRC 1228)** – Universidad Tecnológica de Bolívar.
Parte del detector de mensajes tóxicos desarrollado en Ingeniería de Software.

## Cómo funciona

```
percibir → normalizar → clasificar → recordar → decidir → actuar → aprender
```

## Equipo

| Integrante | Rol | Rama |
|---|---|---|
| Ana Cerro Pérez | Núcleo del agente (backend) | `feature/agente` |
| Sara Vargas Vasquez | Percepción y NLP | `feature/nlp` |
| Sofía Mejía González | Interfaz del agente (frontend) | `feature/frontend-agente` |
| Bianca Mastrascusa Camargo | Datos, evaluación y aprendizaje | `feature/evaluacion` |

Profesora: Yuranis Henriquez Núñez · Sustentación: 19 de noviembre de 2026

## Tecnologías

FastAPI · MySQL · React + Vite · Hugging Face Transformers

## Cómo correrlo

**Backend**
```
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --port 8000
```

**Frontend**
```
cd frontend
npm install
npm run dev
```

## Estado

🚧 En desarrollo: adaptando el detector original a un agente inteligente.