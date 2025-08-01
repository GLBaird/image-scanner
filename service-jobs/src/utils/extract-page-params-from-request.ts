import { status } from '@grpc/grpc-js';
import { Order } from '../generated/jobmanager/Order';
import ServiceError from './ServiceError';

function extractPageParamsFromRequest(request: {
    items?: number;
    cursor?: string;
    order?: Order;
}): {
    items: number;
    cursor: string;
    order: 'asc' | 'desc';
} {
    const items = typeof request.items === 'number' ? request.items : 200;
    const cursor = request.cursor ?? '';
    const order = request.order === Order.DESC ? 'desc' : 'asc';

    if (items <= 0) {
        throw new ServiceError('bad request', status.CANCELLED);
    }
    if (items > 2000) {
        throw new ServiceError('bad request - batch size too large', status.CANCELLED);
    }
    return { items, cursor, order };
}

export default extractPageParamsFromRequest;
