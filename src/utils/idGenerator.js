const idGenerator = (array) => {
    if (array.length === 0) return 1;
    else return array.lenght + 1;
  };

  export default idGenerator;