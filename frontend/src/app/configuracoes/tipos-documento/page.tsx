export default function TiposDocumentoPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">
        Tipos de Documento
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        Categorizar o documento de cada entrega não faz mais sentido no
        modelo atual.
      </p>
      <div className="mt-8 border border-slate-200 bg-white p-6 text-sm text-slate-500">
        Decidimos não ter uma tela de tipos de documento — praticamente toda
        entrega é do mesmo tipo (NF-e acompanhando a mercadoria), não haveria
        o que categorizar. O número da NF-e já é registrado direto em cada
        entrega. Ver "Motoristas" no menu para o cadastro que substituiu esta
        tela.
      </div>
    </div>
  );
}
