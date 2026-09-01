import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ThreadsService } from './threads.service';
import { CreateThreadDto } from './dto/create-thread.dto';
import { UpdateThreadDto } from './dto/update-thread.dto';
import { PaginationDto } from './dto/pagination.dto';
import {
  PaginatedThreadsDto,
  ThreadResponseDto,
} from './dto/thread-response.dto';
import { CurrentUser } from '../auth/current-user.decorator';

@ApiTags('threads')
@Controller('threads')
export class ThreadsController {
  constructor(private readonly threadsService: ThreadsService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new thread' })
  @ApiResponse({
    status: 201,
    description: 'Thread created',
    type: ThreadResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(@CurrentUser() user: CurrentUser, @Body() dto: CreateThreadDto) {
    return this.threadsService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all threads (paginated)' })
  @ApiResponse({
    status: 200,
    description: 'Threads',
    type: PaginatedThreadsDto,
  })
  findAll(@Query() pagination: PaginationDto) {
    return this.threadsService.findAll(pagination);
  }

  @Get('my-threads')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List the current user threads' })
  @ApiResponse({
    status: 200,
    description: 'Threads',
    type: [ThreadResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findMyThreads(@CurrentUser() user: CurrentUser) {
    return this.threadsService.findMyThreads(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a thread by id' })
  @ApiResponse({ status: 200, description: 'Thread', type: ThreadResponseDto })
  @ApiResponse({ status: 404, description: 'Thread not found' })
  findOne(@Param('id') id: string) {
    return this.threadsService.findOne(id);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a thread (owner only)' })
  @ApiResponse({
    status: 200,
    description: 'Updated thread',
    type: ThreadResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not the owner' })
  @ApiResponse({ status: 404, description: 'Thread not found' })
  update(
    @CurrentUser() user: CurrentUser,
    @Param('id') id: string,
    @Body() dto: UpdateThreadDto,
  ) {
    return this.threadsService.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a thread (owner only)' })
  @ApiResponse({ status: 204, description: 'Deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not the owner' })
  @ApiResponse({ status: 404, description: 'Thread not found' })
  remove(@CurrentUser() user: CurrentUser, @Param('id') id: string) {
    return this.threadsService.remove(user.id, id);
  }
}
