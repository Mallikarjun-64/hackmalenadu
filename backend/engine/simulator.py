import asyncio
from .data_generator import generate_network_event, generate_endpoint_event, generate_application_event
from .ingestion import normalize_event

async def run_simulation(scenario: str, event_queue: asyncio.Queue):
    """
    Simulates bursts of traffic based on the scenario.
    """
    for i in range(50):
        # Generate some benign noise
        raw_net = generate_network_event(is_malicious=False)
        raw_end = generate_endpoint_event(is_malicious=False)
        raw_app = generate_application_event(is_malicious=False)
        await event_queue.put(normalize_event(raw_net))
        await event_queue.put(normalize_event(raw_end))
        await event_queue.put(normalize_event(raw_app))
        
        # Inject malicious behavior based on scenario
        if scenario == "exfiltration" and i == 25:
            # Burst of exfiltration
            exf_net = generate_network_event(True, "exfiltration", src_ip="10.0.1.15", dst_ip="185.220.101.34")
            exf_end = generate_endpoint_event(True, "exfiltration", hostname="desktop-4892", src_ip="10.0.1.15")
            exf_app = generate_application_event(True, "exfiltration", src_ip="10.0.1.15")
            await event_queue.put(normalize_event(exf_net))
            await event_queue.put(normalize_event(exf_end))
            await event_queue.put(normalize_event(exf_app))
            
        if scenario == "lateral_movement" and i == 30:
            lat_net = generate_network_event(True, "lateral_movement", src_ip="10.0.1.42")
            lat_end = generate_endpoint_event(True, "lateral_movement", hostname="desktop-1022", src_ip="10.0.1.42")
            await event_queue.put(normalize_event(lat_net))
            await event_queue.put(normalize_event(lat_end))

        await asyncio.sleep(0.05) # Simulate real-time delay
