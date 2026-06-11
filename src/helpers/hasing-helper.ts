import * as bcrypt from 'bcrypt';

export const compareData = async (
  password: string,
  comparePassword: string,
) => {
  return await bcrypt.compare(password, comparePassword);
};

export const hashData = async (password: string) => {
  return await bcrypt.hash(password, 10);
};
