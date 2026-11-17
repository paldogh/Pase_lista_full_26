export type FacialStudent = {
  id?: string;
  matricula?: string;
  nombre?: string;
  apellidoPaterno?: string;
  apellidoMaterno?: string;
  grupo?: string | null;
};

export type FacialAttendanceResponse = {
  success: boolean;
  message: string;
  alumno?: FacialStudent;
  confidence?: number;
  attendance?: {
    id?: string;
    estado?: "PRESENTE" | "RETARDO";
    fechaHora?: string;
  };
};
