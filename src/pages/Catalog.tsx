import { useState, useEffect } from "react";
import { api } from "../services/api";
import type { Prestacion } from "../services/api";
import { Stethoscope, Plus, Edit2, Box, DollarSign, Layers } from "lucide-react";

export const Catalog = () => {
  const [services, setServices] = useState<Prestacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState<number | "">("");
  const [boxId, setBoxId] = useState<number | "">("");
  const [cupoDisponible, setCupoDisponible] = useState<number | "">("");

  const loadCatalog = async () => {
    setLoading(true);
    try {
      const data = await api.getServices();
      setServices(data);
    } catch (err) {
      console.error("Error al cargar catálogo:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCatalog();
  }, []);

  const handleOpenModal = (service?: Prestacion) => {
    if (service) {
      setEditingId(service.id!);
      setNombre(service.nombre);
      setPrecio(service.precio);
      setBoxId(service.boxId);
      setCupoDisponible(service.cupoDisponible);
    } else {
      setEditingId(null);
      setNombre("");
      setPrecio("");
      setBoxId("");
      setCupoDisponible("");
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      nombre,
      precio: Number(precio),
      boxId: Number(boxId),
      cupoDisponible: Number(cupoDisponible),
    };

    try {
      if (editingId) {
        await api.updateService(editingId, payload);
      } else {
        await api.createService(payload);
      }
      setShowModal(false);
      loadCatalog();
    } catch (err: any) {
      alert("Error al guardar prestación: " + err.message);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 font-sans">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Stethoscope className="w-6 h-6 text-blue-600" /> Catálogo de Prestaciones y Boxes
          </h1>
          <p className="text-xs text-slate-500 mt-1">Configuración de aranceles y disponibilidad de recintos médicos</p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl text-xs font-semibold transition shadow-md"
        >
          <Plus className="w-4 h-4" /> Nueva Prestación
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 text-center py-8 text-xs text-slate-400">Cargando catálogo...</div>
        ) : services.length === 0 ? (
          <div className="col-span-3 text-center py-8 text-xs text-slate-400">No hay prestaciones registradas.</div>
        ) : (
          services.map((item) => (
            <div key={item.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-blue-300 transition">
              <div>
                <div className="flex justify-between items-start mb-3">
                  <span className="p-2.5 rounded-xl bg-blue-50 text-blue-600 font-bold text-xs">
                    <Box className="w-4 h-4 inline mr-1" /> Box #{item.boxId}
                  </span>
                  <button 
                    onClick={() => handleOpenModal(item)}
                    className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>

                <h3 className="text-base font-bold text-slate-900 mb-1">{item.nombre}</h3>
                <p className="text-2xl font-extrabold text-slate-800 my-2">
                  ${item.precio?.toLocaleString("es-CL")}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
                <span className="flex items-center gap-1 font-semibold text-emerald-600">
                  <Layers className="w-3.5 h-3.5" /> Cupos: {item.cupoDisponible}
                </span>
                <span className="text-[11px] text-slate-400">ID: #{item.id}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Formulario */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white max-w-md w-full rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">
              {editingId ? "Editar Prestación" : "Nueva Prestación Médica"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nombre de la Prestación</label>
                <input 
                  type="text" 
                  value={nombre} 
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Consulta Cardiología"
                  className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-900"
                  required 
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Precio ($)</label>
                  <input 
                    type="number" 
                    value={precio} 
                    onChange={(e) => setPrecio(Number(e.target.value))}
                    placeholder="35000"
                    className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-900"
                    required 
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Box Asignado</label>
                  <input 
                    type="number" 
                    value={boxId} 
                    onChange={(e) => setBoxId(Number(e.target.value))}
                    placeholder="101"
                    className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-900"
                    required 
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Cupos Disponibles</label>
                <input 
                  type="number" 
                  value={cupoDisponible} 
                  onChange={(e) => setCupoDisponible(Number(e.target.value))}
                  placeholder="20"
                  className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-900"
                  required 
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-slate-900 text-white font-semibold shadow-md"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};