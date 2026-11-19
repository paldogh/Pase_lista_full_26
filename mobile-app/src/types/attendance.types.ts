export type FacialAttendanceResponse = {
  success: boolean;
  message?: string;
  alumno?: {
    id?: string;
    matricula?: string;
    nombre?: string;
    apellidos?: string;
  };
  student?: {
    id?: string;
    matricula?: string;
    nombre?: string;
    apellidos?: string;
  };
  asistencia?: {
    id?: string;
    fecha?: string;
    hora?: string;
    estado?: string;
  };
  distance?: number;
  model?: string;
  [key: string]: unknown;
};
