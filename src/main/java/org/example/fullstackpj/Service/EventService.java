package org.example.fullstackpj.Service;

import org.example.fullstackpj.Entity.Event;
import org.example.fullstackpj.Repository.EventRepository;
import org.springframework.stereotype.Service;

import java.sql.Date;
import java.util.List;

@Service
public class EventService {

    private final EventRepository eventRepository;

    public EventService(EventRepository eventRepository) {
        this.eventRepository = eventRepository;
    }

    public Event createEvent(Event event) {
        return eventRepository.save(event);
    }

    public Event getEventById(Long id) {
        return eventRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Driver not found"));
    }


    public List<Event> getAllEvents() {
        return eventRepository.findAll();
    }

    public List<Event> getEventsByCategory(Long categoryId) {
        return eventRepository.findByCategoryId(categoryId);
    }

    public List<Event> getEventsAfterDate(Date date) {
        return eventRepository.findByDeadlineAfter(date);
    }

    public void deleteEvent(Long id) {
        eventRepository.deleteById(id);
    }
}
