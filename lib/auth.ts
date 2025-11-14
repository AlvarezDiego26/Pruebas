import jwt from 'jsonwebtoken';

export function signToken(payload: object) {
  return jwt.sign(payload, process.env.JWT_SECRET as string, {
    expiresIn: '7d',
    algorithm: 'HS512', // 🔐 más fuerte que el HS256 por defecto
  });
}

export function verifyToken(token: string) {
  return jwt.verify(token, process.env.JWT_SECRET as string, {
    algorithms: ['HS512'],
  });
}
