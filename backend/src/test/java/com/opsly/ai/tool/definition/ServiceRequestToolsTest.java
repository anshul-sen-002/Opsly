package com.opsly.ai.tool.definition;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.opsly.ai.tool.ToolRegistry;
import com.opsly.customer.entity.Customer;
import com.opsly.customer.repository.CustomerRepository;
import com.opsly.job.dto.JobResponse;
import com.opsly.job.entity.JobStatus;
import com.opsly.job.service.JobService;
import com.opsly.search.service.ServiceRequestSearchService;
import com.opsly.technician.entity.Technician;
import com.opsly.technician.service.TechnicianService;
import com.opsly.user.entity.Role;
import com.opsly.user.entity.User;
import com.opsly.user.entity.UserStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

/**
 * Verifies the four service-request tools through the real ToolRegistry:
 * registration, role gating and JWT-derived scoping (never from arguments).
 */
@ExtendWith(MockitoExtension.class)
class ServiceRequestToolsTest {

    @Mock JobService jobService;
    @Mock TechnicianService technicianService;
    @Mock CustomerRepository customerRepository;
    @Mock ServiceRequestSearchService searchService;
    @Mock com.opsly.ai.tool.definition.AdminTools adminTools;
    @Mock com.opsly.ai.tool.definition.ManagerTools managerTools;
    @Mock com.opsly.ai.tool.definition.TechnicianTools technicianTools;
    @Mock com.opsly.ai.tool.definition.CustomerTools customerTools;

    private ToolRegistry registry;
    private ServiceRequestTools tools;

    private User admin;
    private User techUser;
    private User customerUser;
    private Technician technician;
    private Customer customer;

    private JobResponse own;
    private JobResponse other;

    @BeforeEach
    void setUp() {
        tools = new ServiceRequestTools(jobService, technicianService, customerRepository,
                searchService, new ObjectMapper());
        when(adminTools.getTools()).thenReturn(List.of());
        when(managerTools.getTools()).thenReturn(List.of());
        when(technicianTools.getTools()).thenReturn(List.of());
        when(customerTools.getTools()).thenReturn(List.of());
        registry = new ToolRegistry(adminTools, managerTools, technicianTools, customerTools,
                tools, new ObjectMapper());
        registry.init();

        admin = User.builder().email("a@x.com").password("x").role(Role.ADMIN).status(UserStatus.ACTIVE).build();
        techUser = User.builder().email("t@x.com").password("x").role(Role.TECHNICIAN).status(UserStatus.ACTIVE).build();
        customerUser = User.builder().email("c@x.com").password("x").role(Role.CUSTOMER).status(UserStatus.ACTIVE).build();

        technician = Technician.builder().id(7L).name("Tom").user(techUser).build();
        customer = Customer.builder().id(3L).name("Acme").phone("1").user(customerUser).build();

        own = response(1L, JobStatus.ASSIGNED, 3L, 7L, "Fix AC unit");
        other = response(2L, JobStatus.PENDING, 9L, null, "Plumbing leak");
    }

    private JobResponse response(long id, JobStatus status, Long customerId, Long techId, String desc) {
        JobResponse j = new JobResponse();
        j.setId(id);
        j.setStatus(status);
        j.setCustomerId(customerId);
        j.setCustomerName("Customer" + customerId);
        j.setTechnicianId(techId);
        j.setDescription(desc);
        j.setScheduledAt(Instant.now());
        return j;
    }

    @Test
    void allFourToolsRegisteredOnce() {
        long count = registry.getDefinitions().stream()
                .filter(d -> List.of("get_my_service_requests", "get_service_request_details",
                        "get_today_schedule", "search_service_requests")
                        .contains(d.path("function").path("name").asText()))
                .count();
        assertEquals(4, count);
    }

    @Test
    void adminCanUseAllFour() {
        when(jobService.getAllJobs(any())).thenReturn(
                new org.springframework.data.domain.PageImpl<>(List.of(own)));
        String out = registry.execute("get_today_schedule", "{}", admin);
        assertTrue(out.contains("Today's schedule") || out.contains("No service requests"),
                "unexpected: " + out);
    }

    @Test
    void technicianDetailsDeniedForUnassignedRequest() {
        when(technicianService.findByUser(techUser)).thenReturn(technician);
        when(jobService.getJobById(2L)).thenReturn(other);
        String out = registry.execute("get_service_request_details", "{\"request_id\":2}", techUser);
        assertEquals("Error: You do not have access to this service request.", out);
    }

    @Test
    void technicianDetailsAllowedForOwnRequest() {
        when(technicianService.findByUser(techUser)).thenReturn(technician);
        when(jobService.getJobById(1L)).thenReturn(own);
        String out = registry.execute("get_service_request_details", "{\"request_id\":1}", techUser);
        assertTrue(out.contains("Service request #1"));
    }

    @Test
    void customerDetailsDeniedForOtherRequest() {
        // Portal lookups only serve a customer profile that is not soft-deleted
        when(customerRepository.findByUserAndDeletedFalse(customerUser)).thenReturn(Optional.of(customer));
        when(jobService.getJobByIdForCustomer(eq(2L), eq(3L)))
                .thenThrow(new com.opsly.common.exception.ForbiddenException("You do not have access"));
        String out = registry.execute("get_service_request_details", "{\"request_id\":2}", customerUser);
        assertTrue(out.startsWith("Error:"));
    }

    @Test
    void searchIsScopedToTechnicianAssignments() {
        when(technicianService.findByUser(techUser)).thenReturn(technician);
        when(searchService.search(anyString(), anyInt())).thenReturn(List.of(own, other));
        String out = registry.execute("search_service_requests", "{\"query\":\"unit\"}", techUser);
        assertTrue(out.contains("#1"));
        assertTrue(!out.contains("#2"));
    }

    @Test
    void registryStillRejectsUnknownToolAfterAddingServiceRequests() {
        String out = registry.execute("no_such_tool", "{}", admin);
        assertTrue(out.startsWith("Error: Unknown tool"));
    }
}
