export const fetchData = async () => {
  const API_KEY = process.env.REACT_APP_GOOGLE_PRIVATE_KEY;
  
  // Por enquanto, retorna dados mock
  return {
    printers: [
      { id: 1, setor: "Almoxarifado", status: "online", marca: "Kyocera", modelo: "FS1135", contador: 113198 },
      { id: 2, setor: "Biblioteca", status: "offline", marca: "Kyocera", modelo: "M2035", contador: null },
    ],
    estoque: [
      { id: 1, fab: "Kyocera", modelo: "TK-1147", atual: 1, min: 2 },
      { id: 2, fab: "Kyocera", modelo: "TK-1175", atual: 10, min: 2 },
    ],
    dataLeitura: new Date().toLocaleDateString('pt-BR')
  };
};