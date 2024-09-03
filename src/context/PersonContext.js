import { createContext, useState, useRef } from "react";
import Individuo from "../classes/Individuo";

const PersonContext = createContext();

// Proveedor del contexto para las personas
const PersonProvider = ({ children }) => {
  const [name, setName] = useState("");

  const [flagName, setFlagName] = useState(true);

  const [flagValue, setFlagValue] = useState(true);

  const [value, setValue] = useState("");

  const [persons, setPersons] = useState([]);

  const inputNameRef = useRef(null);

  const inputValueRef = useRef(null);

  const handleNameChange = (e) => {
    if (e.target.value.trim().length > 0) setFlagName(true);
    else setFlagName(false);
    setName(e.target.value);
  };

  const handleValueChange = (e) => {
    if (e.target.value.length > 0) setFlagValue(true);
    else setFlagValue(false);
    setValue(e.target.value);
  };

  const handlePersons = () => {
    if (name.length > 0 && value.length > 0) {
      let person = new Individuo(name, value, persons);
      addPerson(person);
      setArrayResult([]);
      setName("");
      setValue("");
    } else if (!name && !value) {
      setFlagName(false);
      setFlagValue(false);
      inputNameRef.current.focus();
    } else if (!name) {
      setFlagName(false);
      setFlagValue(true);
      inputNameRef.current.focus();
    } else {
      setFlagValue(false);
      setFlagName(true);
      inputValueRef.current.focus();
    }
  };

  // Función para agregar una nueva persona
  const addPerson = (person) => {
    const newPerson = { ...person };
    setPersons([...persons, newPerson]);
  };

  // Función para eliminar una persona por id
  const removePerson = (id) => {
    const updatedPersons = persons
      .filter((person) => person.id !== id)
      .map((person, index) => ({ ...person, id: index + 1 }));
    setPersons(updatedPersons);
  };

  const updatePerson = (id, newPerson) => {
    const updatedPersons = persons.map((person) =>
      person.id === id ? { ...newPerson, id } : person
    );
    setPersons(updatedPersons);
  };

  return (
    <PersonContext.Provider
      value={{ persons, handlePersons, removePerson, updatePerson, handleNameChange, handleValueChange, handlePersons, flagName, flagValue, inputNameRef, inputValueRef }}
    >
      {children}
    </PersonContext.Provider>
  );
};

export { PersonProvider, PersonContext };
