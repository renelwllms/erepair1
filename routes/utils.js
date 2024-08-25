const getPagination = (current, pageSize, total = 0) => {
  return { current, pageSize, total };
};

module.exports = {
    getPagination,
};
