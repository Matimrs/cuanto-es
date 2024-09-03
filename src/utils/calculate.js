import Deudor from "../classes/Deudor";

export const calculate = (array) => {
    const aux = JSON.parse(JSON.stringify(array));
  
    let prom = 0;
  
    aux.forEach((e) => {
      prom += e.gasto / aux.length;
    });
  
    aux.forEach((e) => {
      if (e.gasto > prom) {
        e.recibe = true;
        let paga;
        aux.forEach((x) => {
          if (x !== e) {
            if (x.gasto < prom) {
              if (e.gasto - prom > prom - x.gasto) {
                e.gasto -= prom - x.gasto;
                paga = prom - x.gasto;
                x.gasto = prom;
              } else if (e.gasto - prom < prom - x.gasto) {
                paga = e.gasto - prom;
                e.gasto = prom;
                x.gasto += paga;
              } else {
                paga = e.gasto - prom;
                e.gasto = prom;
                x.gasto = prom;
              }
              let aux = new Deudor(x.name, paga);
              e.lepaga.push(aux);
            }
          }
        });
      }
    });
    return aux;
  };