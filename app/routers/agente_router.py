"""Endpoints del agente inteligente."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware import get_current_user
from app.models import Usuario
from app.agent.adaptador_nlp import preparar_resultado_nlp
from app.agent.tipos import Percepcion, ResultadoNLP
from app.agent.agente import procesar

router = APIRouter(prefix="/agente", tags=["Agente inteligente"])


class AnalizarRequest(BaseModel):
    texto: str = Field(..., min_length=1)
    texto_padre: str | None = None


@router.post("/analizar", summary="Analizar mensaje sin publicarlo")
async def analizar_mensaje(
    datos: AnalizarRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Analiza un mensaje y devuelve la decisión sin persistirla."""

    percepcion = Percepcion(
        texto=datos.texto,
        autor_id=current_user.id,
        curso_id=0,
        hilo_id=0,
        texto_padre=datos.texto_padre,
    )

    try:
        resultado = preparar_resultado_nlp(
            texto=datos.texto,
            texto_padre=datos.texto_padre,
            explicar=True,
        )
        resultado_nlp = ResultadoNLP(**resultado)
    except Exception:
        resultado_nlp = None

    decision = procesar(
        percepcion=percepcion,
        resultado_nlp=resultado_nlp,
    )

    return {
        "success": True,
        "data": {
            "accion": decision.accion,
            "score_toxicidad": decision.nlp.score_toxicidad,
            "probabilidades": decision.nlp.probabilidades,
            "costo_esperado": decision.costo_esperado,
            "reincidencia": decision.reincidencia,
            "explicacion": decision.explicacion,
            "fragmentos": decision.nlp.fragmentos,
            "modelo": decision.nlp.modelo,
        },
    }

