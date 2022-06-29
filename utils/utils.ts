export const toLowerCase = (val: string): string => {
  if (val) return val.toLowerCase();
  else return val;
};

export const compareLowercase = (string1: string, string2: string) => {
  return string1.toLowerCase() === string2.toLowerCase();
};
