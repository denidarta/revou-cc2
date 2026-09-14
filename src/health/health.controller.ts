import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { HealthResponseDto } from './dto/health-response.dto';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Liveness probe for the running service' })
  @ApiResponse({
    status: 200,
    description: 'Service is up',
    type: HealthResponseDto,
  })
  check(): HealthResponseDto {
    return { status: 'ok' };
  }
}
