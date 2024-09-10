const idGenerator = (array) => {
    console.log(array.length);
    if (array.length === 0 || !array) return 1;
    else return (array.length + 1);
  };

  export default idGenerator;