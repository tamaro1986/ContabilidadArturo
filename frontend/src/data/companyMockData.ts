// frontend/src/data/companyMockData.ts
import { Company } from "../types/companyTypes";

export const companyMockData: Company[] = [
    {
        id: "1",
        tenant_id: "tenant-1",
        user_id: "user-1",
        name: "Distribuciones García S.A. de C.V.",
        nit: "0614-120595-001-3",
        lastProcessedMonth: "Mayo 2024",
        status: "active",
        totalRecords: 1450,
        created_at: "2024-01-15T00:00:00Z",
        updated_at: "2024-01-15T00:00:00Z"
    },
    {
        id: "2",
        tenant_id: "tenant-1",
        user_id: "user-1",
        name: "Importadora Centro Comercial",
        nit: "0614-080388-102-7",
        lastProcessedMonth: "Abril 2024",
        status: "active",
        totalRecords: 890,
        created_at: "2024-02-10T00:00:00Z",
        updated_at: "2024-02-10T00:00:00Z"
    },
    {
        id: "3",
        tenant_id: "tenant-1",
        user_id: "user-1",
        name: "Servicios Técnicos Profesionales",
        nit: "0614-150790-045-1",
        lastProcessedMonth: "Marzo 2024",
        status: "pending",
        totalRecords: 320,
        created_at: "2024-03-05T00:00:00Z",
        updated_at: "2024-03-05T00:00:00Z"
    },
    {
        id: "4",
        tenant_id: "tenant-1",
        user_id: "user-1",
        name: "Agrícola El Volcán S.A.",
        nit: "0614-220172-088-5",
        lastProcessedMonth: "Enero 2024",
        status: "error",
        totalRecords: 120,
        created_at: "2024-04-20T00:00:00Z",
        updated_at: "2024-04-20T00:00:00Z"
    }
];
