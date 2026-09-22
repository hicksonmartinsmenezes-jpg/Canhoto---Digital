# Geocoder local — Canhoto Digital

Serviço interno de geocodificação usado pelo cadastro de entregas.

## Estratégia

1. **geocodebr/CNEFE (principal)** — roda localmente e usa dados abertos de
   endereços brasileiros do IBGE/CNEFE.
2. **Photon/OpenStreetMap (fallback no Next.js)** — usado somente quando o
   geocodebr não devolve um resultado com precisão suficiente.

O serviço não exige chave de API, cartão ou cobrança por consulta.

## Dados

Na primeira inicialização o container baixa o conjunto de dados do CNEFE usado
pelo geocodebr. O cache fica no volume Docker `canhoto_geocoder_cache` e não é
baixado novamente em reinicializações normais.

O pacote geocodebr é fixado no commit:

`416f006d7cbf33f159e239153048642dea9ec29b`

Isso evita que uma atualização upstream altere o comportamento do sistema sem
revisão.

## Subir o serviço

Na raiz do projeto:

```powershell
docker compose build geocoder
docker compose up -d geocoder
docker compose logs -f geocoder
```

Quando aparecer:

```text
[geocoder] CNEFE pronto.
```

o serviço estará disponível em:

```text
http://127.0.0.1:8001/health
```

## Teste manual

```powershell
$body = @{
  endereco = "Rua Exemplo, 123"
  cep = "00000000"
} | ConvertTo-Json

Invoke-RestMethod -Method Post `
  -Uri "http://127.0.0.1:8001/geocode" `
  -ContentType "application/json" `
  -Body $body
```

Um resultado aceito retorna `ok: true`, latitude, longitude, precisão e
desvio estimado em metros.

## Critério de confiança

Para navegação automática, o serviço aceita apenas:

- precisão `numero` com desvio de até 120 m;
- precisão `numero_aproximado` com desvio de até 80 m.

Resultados menos precisos não são gravados como destino. Nesse caso o Next.js
tenta o fallback Photon e, se ele também falhar, o Waze recebe o endereço
textual.
