const idGenerator = (array) => {
    if (array.length === 0 || !array) return 1;
    else return (array.length + 1);
  };

  export default idGenerator;