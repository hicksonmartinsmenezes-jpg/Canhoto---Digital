import { describe, expect, it } from "vitest";
import {
  ehPdf,
  extensaoDocumento,
  lerDadosNfe,
  lerDadosNfeDoTextoDanfe,
  tipoDoXmlFiscal,
} from "./documento-fiscal";

const NFE = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe"><NFe><infNFe Id="NFe123" versao="4.00">
<ide><nNF>4512</nNF></ide>
<emit><xNome>RILDON ELETROPECAS</xNome></emit>
<dest><CNPJ>1</CNPJ><xNome>Hickson &amp; Martins Ltda</xNome>
<enderDest><xLgr>Rua das Flores</xLgr><nro>120</nro><xCpl>Casa 2</xCpl><xBairro>Centro</xBairro><xMun>Aracaju</xMun><UF>SE</UF><CEP>49010000</CEP><fone>5579999998888</fone></enderDest></dest>
<det nItem="1"><prod><xProd>Peça</xProd><xPed>PED-77</xPed></prod></det>
<total><ICMSTot><vNF>1234.56</vNF></ICMSTot></total>
<pag><detPag><tPag>17</tPag><vPag>1234.56</vPag></detPag></pag>
</infNFe></NFe></nfeProc>`;

describe("documento fiscal", () => {
  it("reconhece NF-e, CT-e e arquivos que não são fiscais", () => {
    expect(tipoDoXmlFiscal(NFE)).toBe("xml_nfe");
    expect(tipoDoXmlFiscal("﻿" + NFE)).toBe("xml_nfe");
    expect(tipoDoXmlFiscal('<cteProc><CTe><infCte Id="x">')).toBe("xml_cte");
    expect(tipoDoXmlFiscal("<html><body>oi</body></html>")).toBeNull();
    expect(tipoDoXmlFiscal("texto solto")).toBeNull();
  });

  it("lê destinatário, nota, pedido, valor e pagamento", () => {
    expect(lerDadosNfe(NFE)).toEqual({
      clienteNome: "Hickson & Martins Ltda",
      clienteTelefone: "79999998888",
      endereco: "Rua das Flores, 120, Casa 2, Centro",
      cep: "49010000",
      numeroNfe: "4512",
      numeroPedido: "PED-77",
      valor: 1234.56,
      formaPagamento: "pix",
    });
  });

  it("ignora campos ausentes ou inválidos", () => {
    const dados = lerDadosNfe(
      "<infNFe><dest><xNome>Ana</xNome><enderDest><CEP>123</CEP><fone>99</fone></enderDest></dest><ICMSTot><vNF>abc</vNF></ICMSTot><detPag><tPag>99</tPag></detPag></infNFe>"
    );
    expect(dados).toEqual({ clienteNome: "Ana" });
  });

  it("lê NF-e sem DDD no telefone, pedido no texto livre e pagamento a prazo", () => {
    const dados = lerDadosNfe(
      "<NFe><infNFe><ide><nNF>319323</nNF></ide><emit><enderEmit><fone>7932537250</fone></enderEmit></emit>" +
        "<dest><xNome>Oficina Teste</xNome><enderDest><xLgr>Rod BR 101</xLgr><nro>10</nro><xBairro>Palestina</xBairro><CEP>49160000</CEP><fone>32793227</fone></enderDest></dest>" +
        "<det><prod><xProd>Lampada</xProd></prod></det><total><ICMSTot><vNF>316.00</vNF></ICMSTot></total>" +
        "<pag><detPag><tPag>14</tPag></detPag></pag>" +
        "<infAdic><infCpl>FONTE: IBPT  Pedido: 887352  Vend: JOSE</infCpl></infAdic></infNFe></NFe>"
    );
    expect(dados).toMatchObject({
      clienteTelefone: "7932793227",
      numeroPedido: "887352",
      numeroNfe: "319323",
      valor: 316,
      formaPagamento: "prazo",
    });
  });

  it("identifica pagamento por boleto (código fiscal 15) separado de prazo", () => {
    const dados = lerDadosNfe(
      "<infNFe><dest><xNome>Ana</xNome></dest><pag><detPag><tPag>15</tPag></detPag></pag></infNFe>"
    );
    expect(dados).toMatchObject({ formaPagamento: "boleto" });
  });

  it("não expande entidades externas", () => {
    const dados = lerDadosNfe(
      '<!DOCTYPE x [<!ENTITY e SYSTEM "file:///etc/passwd">]><infNFe><dest><xNome>&e;</xNome></dest></infNFe>'
    );
    expect(dados.clienteNome).toBe("&e;");
  });

  it("identifica extensão e PDF", () => {
    expect(extensaoDocumento("Nota 1.XML")).toBe("xml");
    expect(extensaoDocumento("danfe.pdf")).toBe("pdf");
    expect(extensaoDocumento("foto.png")).toBeNull();
    expect(ehPdf(new TextEncoder().encode("%PDF-1.7 ..."))).toBe(true);
    expect(ehPdf(new TextEncoder().encode("<xml>"))).toBe(false);
  });
});

describe("leitura do texto do DANFE (PDF)", () => {
  const DANFE_TEXTO = `DANFE
Documento Auxiliar da Nota Fiscal Eletrônica
Nº 004.512
SÉRIE 001
CHAVE DE ACESSO
2826 1012 3456 7800 0199 5500 1000 0045 1211 2345 6780
DESTINATÁRIO / REMETENTE
NOME/RAZÃO SOCIAL
HICKSON MARTINS LTDA
CNPJ/CPF
12.345.678/0001-99
DATA DA EMISSÃO
28/10/2026
ENDEREÇO
RUA DAS FLORES, 120
BAIRRO/DISTRITO
CENTRO
CEP
49010-000
MUNICÍPIO
FONE/FAX
(79) 99999-8888
UF
SE
CÁLCULO DO IMPOSTO
VALOR TOTAL DA NOTA
1.234,56
DADOS ADICIONAIS
INFORMAÇÕES COMPLEMENTARES
FONTE: IBPT  Pedido: 887352  Vend: JOSE`;

  it("lê nº da nota (pela chave de acesso), destinatário, cep, telefone, pedido e valor", () => {
    expect(lerDadosNfeDoTextoDanfe(DANFE_TEXTO)).toEqual({
      numeroNfe: "4512",
      clienteNome: "HICKSON MARTINS LTDA",
      endereco: "RUA DAS FLORES, 120",
      cep: "49010000",
      clienteTelefone: "79999998888",
      numeroPedido: "887352",
      valor: 1234.56,
    });
  });

  it("decodifica o nº da nota mesmo com a chave sem espaços", () => {
    const dados = lerDadosNfeDoTextoDanfe(
      "CHAVE DE ACESSO\n28261012345678000199550010000045121123456780\nDESTINATÁRIO"
    );
    expect(dados.numeroNfe).toBe("4512");
  });

  it("acha a chave de acesso mesmo quando o bloco do protocolo de autorização separa o rótulo dos dígitos (DANFE real)", () => {
    // Reproduz um layout real em que o pdf.js extrai "CHAVE DE ACESSO" e só
    // bem mais adiante (depois do protocolo de autorização, nº de página e
    // texto de consulta de autenticidade) os 44 dígitos de fato aparecem.
    const dados = lerDadosNfeDoTextoDanfe(
      `CHAVE DE ACESSO
PROTOCOLO DE AUTORIZAÇÃO DE USO
228260026289593 Nº   30/10/2026 11:18 Data
DADOS DOS PRODUTOS/SERVIÇOS
1 /   1
Consulta de autenticidade no portal nacional da NF-e
www.nfe.fazenda.gov.br/portal ou no site da Sefaz Autorizada
28.2610.05.504.249/0001-58-55-001-000.320.352-195.661.307-9`
    );
    expect(dados.numeroNfe).toBe("320352");
  });

  it("não quebra e retorna campos vazios quando o texto não tem nada reconhecível", () => {
    expect(lerDadosNfeDoTextoDanfe("texto qualquer, sem DANFE nenhum")).toEqual(
      {}
    );
  });

  it("ignora chave de acesso incompleta", () => {
    expect(
      lerDadosNfeDoTextoDanfe("CHAVE DE ACESSO\n1234 5678\nDESTINATÁRIO")
    ).toEqual({});
  });
});
