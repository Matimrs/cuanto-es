import Peer from "../classes/Peer";

//persons y categorys son arreglos

export const calculate = (categorys) => {
  //temp es un arreglo de objetos del tipo Peer
  let temp = [];

  categorys.forEach((c) => {
    temp = temp.concat(c.distribute());
  });

  //UNIFICAR PAGOS:

  //result es un arreglo de objetos del tipo Peer
  let resultTemp = [];

  let toRemove = [];

  temp.forEach((p) => {
    if (!toRemove.includes(p.id)) {
      let creditor = p.creditor;
      let debtor = p.debtor;
      let amount = p.amount;

      temp.forEach((p2) => {
        if (p.id !== p2.id && !toRemove.includes(p2.id)) {
          if (
            p.creditor.id === p2.creditor.id &&
            p.debtor.id === p2.debtor.id
          ) {
            amount += p2.amount;
            toRemove.push(p2.id);
          } else if (
            p.creditor.id === p2.debtor.id &&
            p.debtor.id === p2.creditor.id
          ) {
            amount -= p2.amount;
            toRemove.push(p2.id);
          }
        }
      });

      if (amount > 0) {
        resultTemp.push(new Peer(creditor, debtor, amount));
      } else if (amount < 0) {
        resultTemp.push(new Peer(debtor, creditor, -amount));
      } else toRemove.push(p.id);
    }
  });

  const result = deleteChain(resultTemp);

  return result;
};

export default calculate;

const deleteChain = (resultTemp) => {
  const array = [...resultTemp];
  while (containsChain(array)) {
    array.forEach((p) => {
      if (isDebtor(p.creditor.id, array)) {
        const peer1 = p;
        const peer2 = getPeerByDebtor(peer1.creditor.id, array);
        const existsPeer3 = getPeer(p.debtor.id, peer2.creditor.id, array);
        const peer3 = existsPeer3
          ? existsPeer3
          : new Peer(peer2.creditor, p.debtor, 0);
        
        if (peer1.amount > peer2.amount) {
          const difference = peer2.amount;
          peer1.decrement(difference);
          peer3.increment(difference);
          array.splice(array.indexOf(peer2), 1);
          if (existsPeer3 === null) array.push(peer3);
        } else if (peer1.amount === peer2.amount) {
          peer3.increment(peer1.amount);
          array.splice(array.indexOf(peer1), 1);
          array.splice(array.indexOf(peer2), 1);
          if (existsPeer3 === null) array.push(peer3);
        } else {
          const difference = peer1.amount;
          peer2.decrement(difference);
          peer3.increment(difference);
          array.splice(array.indexOf(peer1), 1);
          if (existsPeer3 === null) array.push(peer3);
        }
      }
    });
  }
  return array;
};

const isDebtor = (idDebtor, array) => {
  let flag = false;
  array.forEach((p) => {
    if (p.debtor.id === idDebtor) flag = true;
  });
  return flag;
};

const containsChain = (array) => {
  let flag = false;
  array.forEach((p) => {
    if (isDebtor(p.creditor.id, array)) flag = true;
  });
  return flag;
};

const getPeer = (idDebtor, idCreditor, array) => {
  let peer = null;
  array.forEach((p) => {
    if (p.debtor.id === idDebtor && p.creditor.id === idCreditor) {
      peer = p;
    }
  });
  return peer;
};

const getPeerByDebtor = (idDebtor, array) => {
  let peer = null;
  array.forEach((p) => {
    if (p.debtor.id === idDebtor) {
      peer = p;
    }
  });
  return peer;
};
