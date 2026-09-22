from __future__ import annotations

import math
import os
import re
import threading
import unicodedata
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any

import polars as pl
from fastapi import FastAPI
from pydantic import BaseModel, Field
from geocodebr import (
    busca_por_cep,
    definir_campos,
    definir_pasta_cache,
    geocode,
)

CACHE_DIR = os.environ.get("GEOCODEBR_CACHE_DIR", "/data/geocodebr")
Path(CACHE_DIR).mkdir(parents=True, exist_ok=True)
definir_pasta_cache(CACHE_DIR, verboso=False)

app = FastAPI(
    title="Canhoto Digital Geocoder",
    version="1.0.0",
    docs_url=None,
    redoc_url=None,
)

_geocode_lock = threading.Lock()


class GeocodeRequest(BaseModel):
    endereco: str = Field(min_length=1, max_length=500)
    cep: str = Field(min_length=8, max_length=9)


class GeocodeResponse(BaseModel):
    ok: bool
    latitude: float | None = None
    longitude: float | None = None
    precisao: str | None = None
    tipo_resultado: str | None = None
    desvio_metros: float | None = None
    endereco_encontrado: str | None = None
    motivo: str | None = None
    fonte: str = "geocodebr"


def _normalizar(texto: str | None) -> str:
    valor = unicodedata.normalize("NFKD", texto or "")
    valor = "".join(ch for ch in valor if not unicodedata.combining(ch))
    valor = valor.upper()
    return re.sub(r"[^A-Z0-9]+", " ", valor).strip()


def _somente_digitos(texto: str) -> str:
    return re.sub(r"\D", "", texto)


def _extrair_numero(endereco: str) -> int | None:
    depois_virgula = re.search(r",\s*(\d{1,6})(?:\s|,|$)", endereco)
    if depois_virgula:
        return int(depois_virgula.group(1))

    numeros = re.findall(r"\b(\d{1,6})\b", endereco)
    if not numeros:
        return None

    return int(numeros[-1])


def _score_logradouro(endereco: str, logradouro: str | None) -> float:
    alvo = _normalizar(endereco)
    candidato = _normalizar(logradouro)

    if not alvo or not candidato:
        return 0.0

    score = SequenceMatcher(None, alvo, candidato).ratio()
    if candidato in alvo:
        score += 0.45

    return score


def _to_float(valor: Any) -> float | None:
    if valor is None:
        return None

    try:
        convertido = float(valor)
    except (TypeError, ValueError):
        return None

    return convertido if math.isfinite(convertido) else None


def _resultado_confiavel(
    precisao: str | None,
    desvio_metros: float | None,
) -> bool:
    if desvio_metros is None:
        return False

    if precisao == "numero":
        return desvio_metros <= 120

    if precisao == "numero_aproximado":
        return desvio_metros <= 80

    return False


def _geocodificar(endereco: str, cep: str) -> dict[str, Any]:
    cep_limpo = _somente_digitos(cep)
    if len(cep_limpo) != 8:
        return {"ok": False, "motivo": "cep_invalido"}

    numero = _extrair_numero(endereco)
    if numero is None:
        return {"ok": False, "motivo": "numero_ausente"}

    try:
        candidatos_arrow = busca_por_cep(
            cep=cep_limpo,
            verboso=False,
            cache=True,
        )
    except Exception:
        return {"ok": False, "motivo": "cep_nao_encontrado"}

    candidatos = candidatos_arrow.to_pylist()
    candidatos_validos = [
        item
        for item in candidatos
        if item.get("logradouro")
        and item.get("municipio")
        and item.get("estado")
    ]

    if not candidatos_validos:
        return {"ok": False, "motivo": "cep_sem_logradouro"}

    escolhido = max(
        candidatos_validos,
        key=lambda item: _score_logradouro(
            endereco,
            item.get("logradouro"),
        ),
    )

    score = _score_logradouro(endereco, escolhido.get("logradouro"))
    if score < 0.62:
        return {"ok": False, "motivo": "logradouro_incompativel"}

    entrada = pl.DataFrame(
        {
            "logradouro": [escolhido["logradouro"]],
            "numero": [numero],
            "cep": [cep_limpo],
            "localidade": [escolhido.get("localidade") or ""],
            "municipio": [escolhido["municipio"]],
            "estado": [escolhido["estado"]],
        }
    )

    campos = definir_campos(
        logradouro="logradouro",
        numero="numero",
        cep="cep",
        localidade="localidade",
        municipio="municipio",
        estado="estado",
    )

    try:
        resultado = geocode(
            enderecos=entrada,
            campos_endereco=campos,
            resultado_completo=True,
            resolver_empates=True,
            verboso=False,
            cache=True,
            n_cores=2,
        )
    except Exception:
        return {"ok": False, "motivo": "falha_geocodebr"}

    rows = resultado.to_pylist()
    if not rows:
        return {"ok": False, "motivo": "sem_resultado"}

    row = rows[0]
    latitude = _to_float(row.get("lat"))
    longitude = _to_float(row.get("lon"))
    precisao = row.get("precisao")
    tipo_resultado = row.get("tipo_resultado")
    desvio_metros = _to_float(row.get("desvio_metros"))
    endereco_encontrado = row.get("endereco_encontrado")

    if latitude is None or longitude is None:
        return {
            "ok": False,
            "precisao": precisao,
            "tipo_resultado": tipo_resultado,
            "desvio_metros": desvio_metros,
            "endereco_encontrado": endereco_encontrado,
            "motivo": "coordenadas_ausentes",
        }

    if not _resultado_confiavel(precisao, desvio_metros):
        return {
            "ok": False,
            "latitude": latitude,
            "longitude": longitude,
            "precisao": precisao,
            "tipo_resultado": tipo_resultado,
            "desvio_metros": desvio_metros,
            "endereco_encontrado": endereco_encontrado,
            "motivo": "precisao_insuficiente",
        }

    return {
        "ok": True,
        "latitude": latitude,
        "longitude": longitude,
        "precisao": precisao,
        "tipo_resultado": tipo_resultado,
        "desvio_metros": desvio_metros,
        "endereco_encontrado": endereco_encontrado,
    }


@app.get("/health")
def health() -> dict[str, str | bool]:
    return {
        "ok": True,
        "engine": "geocodebr",
    }


@app.post("/geocode", response_model=GeocodeResponse)
def geocode_address(payload: GeocodeRequest) -> GeocodeResponse:
    with _geocode_lock:
        resultado = _geocodificar(payload.endereco, payload.cep)

    return GeocodeResponse(**resultado)
