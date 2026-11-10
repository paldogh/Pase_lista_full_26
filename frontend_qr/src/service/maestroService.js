import api from "../api";

export const getMaestros = async () => {
  const { data } = await api.get("/maestros");
  console.log("RESPUESTA API MAESTROS:", data);
  if (data?.ok === false || data?.success === false) {
    throw new Error(data.msg || data.message || "No fue posible obtener los maestros");
  }
  return data;
};

export const createMaestro = async (maestro) => {
  const { data } = await api.post("/maestros", {
    nombre: maestro.nombre,
    email: maestro.email,
    password: maestro.password,
    numeroEmpleado: maestro.numeroEmpleado,
    telefono: maestro.telefono || null,
  });
  return data;
};

export const updateMaestro = async (id, maestro) => {
  const { data } = await api.put(`/maestros/${id}`, {
    nombre: maestro.nombre,
    email: maestro.email,
    numeroEmpleado: maestro.numeroEmpleado,
    telefono: maestro.telefono,
  });
  return data;
};

export const deleteMaestro = async (id) => {
  const { data } = await api.delete(`/maestros/${id}`);
  return data;
};

export const importarMaestros = async (datos) => {
  const { data } = await api.post("/maestros/importar", datos);
  return data;
};
