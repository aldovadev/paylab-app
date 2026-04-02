import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiCallLogEntity } from './entities/api-call-log.entity';

@Injectable()
export class ApiCallLogService {
  private readonly logger = new Logger(ApiCallLogService.name);

  constructor(
    @InjectRepository(ApiCallLogEntity)
    private readonly repo: Repository<ApiCallLogEntity>,
  ) {}

  async logCall(data: Partial<ApiCallLogEntity>): Promise<ApiCallLogEntity> {
    const entity = this.repo.create(data);
    const saved = await this.repo.save(entity);
    this.logger.debug(`Logged ${data.direction} ${data.method} ${data.endpoint} for flow ${data.flowId}`);
    return saved;
  }

  async getFlowLogs(flowId: string): Promise<ApiCallLogEntity[]> {
    return this.repo.find({
      where: { flowId },
      order: { createdAt: 'ASC' },
    });
  }
}
