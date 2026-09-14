import type { Response } from "express";

type TMeta = {
  page?: number;
  limit?: number;
  total?: number;
  totalPage?: number;
};

type TResponseData<T> = {
  success: boolean;
  status: number;
  message: string;
  data?: T;
  total?: number;
  meta?: TMeta;
  error?: any;
};

const sendResponse = async <T>(res: Response, data: TResponseData<T>) => {
  res.status(data.status).json({
    success: data.success,
    status: data.status,
    message: data.message,
    total: data.total,
    data: data.data,
    meta: data.meta,
    error: data.error,
  });
};

export default sendResponse;
