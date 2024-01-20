import PersonList from "../PersonList/PersonList";
import { useState } from "react";
import { Link } from "react-router-dom";
import { AddPersonBox } from "../AddPersonBox/AddPersonBox";
class Deudor {
  constructor(name, cant) {
    this.name = name;
    this.paga = cant;
  }
}

class Individuo {
  constructor(nombre, gasto, array) {
    this.name = nombre;
    this.gasto = parseFloat(gasto);
    this.recibe = false;
    this.lepaga = [];
    this.id = idGenerator(array);
  }
}

const idGenerator = (array) => {
  if (array.length === 0) return 1;
  else return array[array.length - 1].id + 1;
};

const calculate = (array) => {
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

const MainContainer = ({ setArrayResult }) => {

  const [name, setName] = useState("");

  const [flagName, setFlagName] = useState(true);

  const [flagValue, setFlagValue] = useState(true);

  const [personList, setPersonList] = useState([]);

  const [value, setValue] = useState("");

  const inputName = document.getElementById("inputName");

  const inputValue = document.getElementById("inputValue");

  const handleNameChange = (e) => {
    setFlagName(true);
    setName(e.target.value);
  };

  const handleValueChange = (e) => {
    setFlagValue(true);
    setValue(e.target.value);
  };

  const handlePersonList = () => {
    if(name && value){
      let person = new Individuo(name, value, personList);
      let aux = JSON.parse(JSON.stringify(personList));
      aux.push(person);
      setFlagName(true);
      setFlagValue(true);
      setPersonList(aux);
      setArrayResult([]);
      setName("");
      setValue("");
    }
    else if (!name && !value){
        setFlagName(false);
        setFlagValue(false);
        inputName.focus();
    }
    else if(!name) {
        setFlagName(false);
        setFlagValue(true);
        inputName.focus();
    }
    else {
        setFlagValue(false);
        setFlagName(true);
        inputValue.focus();
    }
  };

  const handlePersonDelete = (id) => {
    let aux = JSON.parse(JSON.stringify(personList));
    setPersonList(aux.filter((p) => p.id !== id));
    setArrayResult([]);
  };

  const handleEnter = (e) => {
    if (e.key === "Enter") {
      inputName.focus();
      handlePersonList();
    }
  };

  const handleArrayResult = () => {
    let aux = JSON.parse(JSON.stringify(personList));
    const result = calculate(aux).filter((e) => {
      return e.recibe;
    });
    setArrayResult(result);
  };

  return (
    <div
      class="is-flex is-flex-direction-row is-justify-content-center is-align-items-center"
      style={{ height: "calc(100% - 88px)" }}
    >
      <div style={{ width: "40%", minWidth: "250px" }}>
        <div class="is-flex is-flex-direction-column is-justify-content-center is-align-items-center">
          <AddPersonBox
            name={name}
            value={value}
            handleEnter={handleEnter}
            handleNameChange={handleNameChange}
            handleValueChange={handleValueChange}
            flagName={flagName}
            flagValue={flagValue}
          />
          <PersonList
            personList={personList}
            handlePersonDelete={handlePersonDelete}
          />
          {personList.length > 1 && (
            <Link to={"/result"} style={{ width: "100%" }}>
              <button
                onClick={handleArrayResult}
                class="button is-light is-fullwidth mb-3"
              >
                Calculate
              </button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default MainContainer;
