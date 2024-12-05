import { createContext, useState, useRef, useEffect} from "react";
import Person from "../classes/Person";
const PersonContext = createContext();

// Proveedor del contexto para las personas
const PersonProvider = ({ children }) => {

  const [name, setName] = useState("");

  const [flagName, setFlagName] = useState(true);

  const [persons, setPersons] = useState([]);

  const inputNameRef = useRef(null);

  const handleNameChange = (e) => {
    if (e.target.value.trim().length > 0) setFlagName(true);
    else setFlagName(false);
    setName(e.target.value);
  };

  const handlePersons = () => {
    if (name.length > 0) {
      let person = new Person(name, persons);
      addPerson(person);
      setName("");
      inputNameRef.current.focus();
    } else {
      setFlagName(false);
      inputNameRef.current.focus();
    } 
  };

useEffect(()=>{
  
},[persons])

  const getPerson = (personId) => {
    return persons.find(p => p.id === Number(personId));
  } 

  // Función para agregar una nueva persona
  const addPerson = (person) => {
    setPersons([...persons, person]);
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
      value={{
        persons,
        handlePersons,
        getPerson,
        removePerson,
        updatePerson,
        handleNameChange,
        name,
        flagName,
        inputNameRef
      }}
    >
      {children}
    </PersonContext.Provider>
  );
};

export { PersonProvider, PersonContext };
